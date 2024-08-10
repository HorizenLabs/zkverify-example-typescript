#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

source "$SCRIPT_DIR/common.sh"

PROOF_GENERATOR_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
PROJECT_DIR="$PROOF_GENERATOR_DIR/risc0"
DATA_DIR="$PROJECT_DIR/data"

install_risc0_toolchain() {
  echo "Installing RISC Zero toolchain..."

  if ! command -v cargo-binstall &> /dev/null; then
    cargo install cargo-binstall
  else
    echo "cargo-binstall is already installed."
  fi

  if ! command -v cargo-risczero &> /dev/null; then
    cargo binstall cargo-risczero
  else
    echo "cargo-risczero is already installed."
  fi

  if [ "$(uname -s)" = "Darwin" ]; then
    if [ "$(uname -m)" = "x86_64" ] || [ "$(uname -m)" = "arm64" ]; then
      echo "Installing RISC Zero toolchain for macOS with version v2024-04-22.0."
      # See this post:  https://github.com/risc0/risc0/issues/1993
      cargo risczero build-toolchain --version v2024-04-22.0
    else
      echo "Unknown macOS architecture: $(uname -m)"
      exit 1
    fi
  else
    echo "Installing RISC Zero toolchain for non-macOS with version v2024-04-22.0."
    cargo risczero install
  fi
}

create_directories() {
  mkdir -p "$DATA_DIR"
}

verify_project_structure() {
  if [ ! -f "$PROJECT_DIR/Cargo.toml" ]; then
    echo "Cargo.toml not found in $PROJECT_DIR. Please ensure the project is initialized correctly."
    exit 1
  fi
}

run_rust_project() {
  echo "Running the Rust project..."
  cd "$PROJECT_DIR"
  rustc --version
  RISC0_DEV_MODE=0 cargo run --release --bin prove

  if [ $? -ne 0 ]; then
    echo "Execution failed. Please check the output for details."
    exit 1
  fi
}

prompt_for_shell
install_rust "stable"
install_macOS_build_tools
clean_build_artifacts "$PROJECT_DIR"
source "$SHELL_ENV_FILE"
install_risc0_toolchain
create_directories
verify_project_structure
run_rust_project

echo "All steps are completed successfully."
