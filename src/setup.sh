#!/bin/bash

ACCEPTED_PROOF_TYPES=("groth16" "fflonk" "boojum" "risc0")

contains() {
  local element
  for element in "${@:2}"; do
    if [ "$element" == "$1" ]; then
      return 0
    fi
  done
  return 1
}

if [ $# -ne 1 ]; then
  echo "Usage: $0 <proof-type>"
  echo "proof-type: ${ACCEPTED_PROOF_TYPES[*]}"
  exit 1
fi

PROOF_TYPE=$1

if ! contains "$PROOF_TYPE" "${ACCEPTED_PROOF_TYPES[@]}"; then
  echo "Invalid proof type: $PROOF_TYPE"
  echo "Usage: $0 <proof-type>"
  echo "proof-type: ${ACCEPTED_PROOF_TYPES[*]}"
  exit 1
fi

POWERS_OF_TAU_DIR=$(pwd)/powers-of-tau

if [ "$PROOF_TYPE" == "groth16" ] || [ "$PROOF_TYPE" == "fflonk" ]; then
  if [ ! -d "$POWERS_OF_TAU_DIR" ]; then
    ./setup-scripts/setup_powers_of_tau.sh
    if [ $? -ne 0 ]; then
      echo "Powers of Tau setup failed. Exiting."
      exit 1
    fi
  else
    read -p "Powers of Tau directory exists. Do you want to regenerate it? (y/n): " confirm
    if [ "$confirm" == "y" ]; then
      rm -rf "$POWERS_OF_TAU_DIR"
      ./setup-scripts/setup_powers_of_tau.sh
      if [ $? -ne 0 ]; then
        echo "Powers of Tau setup failed. Exiting."
        exit 1
      fi
    fi
  fi
fi

case "$PROOF_TYPE" in
  groth16)
    ./setup-scripts/setup_groth16.sh
    ;;
  fflonk)
    ./setup-scripts/setup_fflonk.sh
    ;;
  boojum)
    ./setup-scripts/setup_boojum.sh
    ;;
  risc0)
    ./setup-scripts/setup_risc0.sh
    ;;
esac
