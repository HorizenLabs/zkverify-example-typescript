#!/bin/bash
set -e

source ./src/setup-scripts/common.sh

POWERS_OF_TAU_DIR="./src/powers-of-tau"

setup_powers_of_tau_directory() {
  confirm_deletion "$POWERS_OF_TAU_DIR"
  mkdir -p "$POWERS_OF_TAU_DIR"
}

start_powers_of_tau_ceremony() {
  echo "Starting Powers of Tau Ceremony..."
  cd "$POWERS_OF_TAU_DIR"

  snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
  if [ $? -ne 0 ]; then
    echo "Error: Failed to create new powers of tau file."
    exit 1
  fi

  # First contribution (input 123)
  echo "123" | snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v
  if [ ! -f pot14_0001.ptau ]; then
    echo "Error: pot14_0001.ptau not found!"
    exit 1
  fi

  # Second contribution
  snarkjs powersoftau contribute pot14_0001.ptau pot14_0002.ptau --name="Second contribution" -v -e="some random text"
  if [ ! -f pot14_0002.ptau ]; then
    echo "Error: pot14_0002.ptau not found!"
    exit 1
  fi

  snarkjs powersoftau verify pot14_0002.ptau
  snarkjs powersoftau beacon pot14_0002.ptau pot14_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
  if [ ! -f pot14_beacon.ptau ]; then
    echo "Error: pot14_beacon.ptau not found!"
    exit 1
  fi

  snarkjs powersoftau prepare phase2 pot14_beacon.ptau pot14_final.ptau -v
  if [ ! -f pot14_final.ptau ]; then
    echo "Error: pot14_final.ptau not found!"
    exit 1
  fi

  snarkjs powersoftau verify pot14_final.ptau

  cd ..
  echo "Powers of Tau Ceremony completed."
}

setup_powers_of_tau_directory
start_powers_of_tau_ceremony

echo "All steps are completed successfully."
