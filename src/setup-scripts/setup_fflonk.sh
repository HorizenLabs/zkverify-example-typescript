#!/bin/bash
set -e
source ./common.sh

PROOF_GENERATOR_DIR=$(pwd)
POWERS_OF_TAU_DIR="$PROOF_GENERATOR_DIR/powers-of-tau"
CIRCUIT_DIR="$PROOF_GENERATOR_DIR/fflonk/circuit"
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

  # Create a Multiplier.circom file
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

  snarkjs fflonk setup "$CIRCUIT_DIR/circuit.r1cs" "$POWERS_OF_TAU_DIR/pot14_final.ptau" "$ZKEY_DIR/circuit_final.zkey"

  if [ ! -f "$ZKEY_DIR/circuit_final.zkey" ]; then
    echo "Error: $ZKEY_DIR/circuit_final.zkey not found!"
    exit 1
  fi

  snarkjs zkey export verificationkey "$ZKEY_DIR/circuit_final.zkey" "$ZKEY_DIR/verification_key.json"

  echo "All steps are completed successfully."
}

generate_proof() {
  echo "Generating the fflonk proof..."
  snarkjs fflonk prove "$ZKEY_DIR/circuit_final.zkey" "$CIRCUIT_DIR/witness.wtns" "$PROOF_DIR/proof.json" "$PROOF_DIR/public.json"
  if [ $? -ne 0 ]; then
    echo "Error: Failed to generate fflonk proof."
    exit 1
  fi
}

verify_proof() {
  echo "Verifying the fflonk proof..."
  snarkjs fflonk verify "$ZKEY_DIR/verification_key.json" "$PROOF_DIR/public.json" "$PROOF_DIR/proof.json"
  if [ $? -ne 0 ]; then
    echo "Error: fflonk Proof verification failed."
    exit 1
  fi

  echo "fflonk proof generated and verified successfully."
}

setup_directories
generate_circuit
generate_witness
setup_proving_system
generate_proof
verify_proof

echo "All steps are completed successfully."
