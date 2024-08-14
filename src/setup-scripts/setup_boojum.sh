#!/bin/bash
set -e
source ./src/setup-scripts/common.sh

PROOF_GENERATOR_DIR=$(pwd)
BOOJUM_REPO_DIR="$PROOF_GENERATOR_DIR/repos/era-boojum"
CIRCUIT_DIR="$PROOF_GENERATOR_DIR/boojum"
RUST_VERSION="nightly-2024-05-07" # Specific nightly version used in their CI

setup_rust() {
  install_rust "$RUST_VERSION"
}

setup_boojum_repo() {
  # Clone Boojum repository if not already present
  if [ ! -d "$BOOJUM_REPO_DIR" ]; then
    git clone https://github.com/matter-labs/era-boojum.git "$BOOJUM_REPO_DIR"
  else
    echo "Boojum repository already exists."
    read -p "Do you want to fetch the latest changes from the Boojum repository? (y/n): " update_repo
    if [ "$update_repo" = "y" ]; then
      cd "$BOOJUM_REPO_DIR"
      git pull
      cd "$PROOF_GENERATOR_DIR"
    fi
  fi
}

setup_circuit_directories() {
  mkdir -p "$CIRCUIT_DIR/src"

  cd "$CIRCUIT_DIR"

  # Confirm deletion of existing files except src/main.rs
  if [ -d "$CIRCUIT_DIR" ]; then
    echo "The following directory will be cleared, excluding 'src/main.rs':"
    ls -R "$CIRCUIT_DIR"

    read -p "Do you want to proceed with the deletion? (y/n): " confirm_delete
    if [ "$confirm_delete" != "y" ]; then
      echo "Aborting deletion."
      exit 0
    fi

    # Delete all files and directories except src/main.rs
    find "$CIRCUIT_DIR" -mindepth 1 -maxdepth 1 ! -name 'src' -exec rm -rf {} +
    find "$CIRCUIT_DIR/src" -mindepth 1 ! -name 'main.rs' -exec rm -rf {} +
  fi
}

setup_rust_project() {
  if [ ! -f "Cargo.toml" ]; then
    cargo init --bin
  fi

  echo "Updating Cargo.toml..."

  cat <<EOL > Cargo.toml
[package]
name = "boojum"
version = "0.1.0"
edition = "2021"

[dependencies]
boojum = { path = "../repos/era-boojum", default-features = false }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
hex = "0.4"
chrono = "0.4"
EOL
}

build_rust_project() {
  echo "Building the Rust project..."
  cargo build --release

  if [ $? -ne 0 ]; then
    echo "Build failed. Please check the errors and try again."
    exit 1
  fi
}

run_rust_project() {
  echo "Running the Rust project..."
  cargo run --release -- 1 2

  if [ $? -ne 0 ]; then
    echo "Execution failed. Please check the output for details."
    exit 1
  fi

  echo "Proof and public inputs have been generated and saved."
}

setup_rust
setup_boojum_repo
setup_circuit_directories
setup_rust_project
build_rust_project
run_rust_project

echo "All steps are completed successfully."
