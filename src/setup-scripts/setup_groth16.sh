#!/bin/bash
set -e

source ./common.sh

PROOF_GENERATOR_DIR=$(pwd)
POWERS_OF_TAU_DIR="$PROOF_GENERATOR_DIR/powers-of-tau"
CIRCUIT_DIR="$PROOF_GENERATOR_DIR/groth16/circuit"
CIRCUIT_JS_DIR="$CIRCUIT_DIR/circuit_js"
ZKEY_DIR="${CIRCUIT_DIR}/zkey"
PROOF_DIR="${CIRCUIT_DIR}/proof"
DATA_DIR="${CIRCUIT_DIR}/data"

setup_directories() {
  confirm_deletion "$CIRCUIT_DIR"
  mkdir -p "$CIRCUIT_DIR"
  mkdir -p "$ZKEY_DIR"
  mkdir -p "$PROOF_DIR"
  mkdir -p "$DATA_DIR"
}

generate_circuit() {
  echo "Generating new circuit..."
  cd "$CIRCUIT_DIR"

  cat <<EOT > circuit.circom
template Multiplier(n) {
    signal input a;
    signal input b;
    signal output c;

    signal int[n];

    int[0] <== a*a + b;
    for (var i=1; i<n; i++) {
        int[i] <== int[i-1]*int[i-1] + b;
    }

    c <== int[n-1];
}

component main = Multiplier(1000);
EOT

  circom circuit.circom --r1cs --wasm --sym
  if [ ! -f circuit.r1cs ]; then
    echo "Error: circuit.r1cs not found!"
    exit 1
  fi

  snarkjs r1cs info circuit.r1cs
  snarkjs r1cs print circuit.r1cs circuit.sym
}

generate_witness() {
  echo "Generating witness..."
  cat <<EOT > input.json
{"a": 2, "b": 3}
EOT

  echo "Running: node $CIRCUIT_JS_DIR/generate_witness.js $CIRCUIT_JS_DIR/circuit.wasm $CIRCUIT_DIR/input.json $CIRCUIT_DIR/witness.wtns"
  node "$CIRCUIT_JS_DIR/generate_witness.js" "$CIRCUIT_JS_DIR/circuit.wasm" "$CIRCUIT_DIR/input.json" "$CIRCUIT_DIR/witness.wtns"

  if [ ! -f "$CIRCUIT_DIR/witness.wtns" ]; then
    echo "Error: witness.wtns not found!"
    exit 1
  fi

  snarkjs wtns check "$CIRCUIT_DIR/circuit.r1cs" "$CIRCUIT_DIR/witness.wtns"
}

setup_proving_system() {
  echo "Starting setup..."
  echo "Current directory: $(pwd)"
  echo "CIRCUIT_DIR: $CIRCUIT_DIR"
  echo "POWERS_OF_TAU_DIR: $POWERS_OF_TAU_DIR"
  echo "ZKEY_DIR: $ZKEY_DIR"

  snarkjs groth16 setup "$CIRCUIT_DIR/circuit.r1cs" "$POWERS_OF_TAU_DIR/pot14_final.ptau" "$ZKEY_DIR/circuit_0000.zkey"

  if [ ! -f "$ZKEY_DIR/circuit_0000.zkey" ]; then
    echo "Error: $ZKEY_DIR/circuit_0000.zkey not found!"
    exit 1
  fi

  # Contribution phase for Groth16
  # First contribution (input 123)
  echo "123" | snarkjs zkey contribute "$ZKEY_DIR/circuit_0000.zkey" "$ZKEY_DIR/circuit_0001.zkey" --name="1st Contributor Name" -v
  if [ ! -f "$ZKEY_DIR/circuit_0001.zkey" ]; then
    echo "Error: $ZKEY_DIR/circuit_0001.zkey not found!"
    exit 1
  fi

  # Second contribution
  snarkjs zkey contribute "$ZKEY_DIR/circuit_0001.zkey" "$ZKEY_DIR/circuit_0002.zkey" --name="Second contribution Name" -v -e="Another random entropy"
  if [ ! -f "$ZKEY_DIR/circuit_0002.zkey" ]; then
    echo "Error: $ZKEY_DIR/circuit_0002.zkey not found!"
    exit 1
  fi

  snarkjs zkey verify "$CIRCUIT_DIR/circuit.r1cs" "$POWERS_OF_TAU_DIR/pot14_final.ptau" "$ZKEY_DIR/circuit_0002.zkey"
  snarkjs zkey beacon "$ZKEY_DIR/circuit_0002.zkey" "$ZKEY_DIR/circuit_final.zkey" 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
  if [ ! -f "$ZKEY_DIR/circuit_final.zkey" ]; then
    echo "Error: $ZKEY_DIR/circuit_final.zkey not found!"
    exit 1
  fi

  snarkjs zkey verify "$CIRCUIT_DIR/circuit.r1cs" "$POWERS_OF_TAU_DIR/pot14_final.ptau" "$ZKEY_DIR/circuit_final.zkey"

  # Export the verification key
  snarkjs zkey export verificationkey "$ZKEY_DIR/circuit_final.zkey" "$ZKEY_DIR/verification_key.json"

  echo "All steps are completed successfully."
}

generate_proof() {
  echo "Generating the groth16 proof..."
  snarkjs groth16 prove "$ZKEY_DIR/circuit_final.zkey" "$CIRCUIT_DIR/witness.wtns" "$PROOF_DIR/proof.json" "$PROOF_DIR/public.json"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to generate groth16 proof."
    exit 1
  fi
}

verify_proof() {
  echo "Verifying the groth16 proof..."
  snarkjs groth16 verify "$ZKEY_DIR/verification_key.json" "$PROOF_DIR/public.json" "$PROOF_DIR/proof.json"
  if [ $? -ne 0 ]; then
    echo "Error: groth16 Proof verification failed."
    exit 1
  fi

  echo "groth16 proof generated and verified successfully."
}

setup_directories
generate_circuit
generate_witness
setup_proving_system
generate_proof
verify_proof

echo "All steps are completed successfully."
