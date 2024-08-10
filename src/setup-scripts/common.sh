#!/bin/bash

install_rust() {
  local rust_version=$1

  echo "Installing Rust and other prerequisites..."

  if ! command -v rustc &> /dev/null; then
    echo "Rust not found, installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    source $HOME/.cargo/env
  else
    echo "Rust is already installed."
  fi

  if ! rustup toolchain list | grep -q "$rust_version"; then
    echo "Specific Rust toolchain not found, installing..."
    rustup install "$rust_version"
  fi

  rustup override set "$rust_version"
  echo "Using Rust toolchain: $rust_version"
}

install_macOS_build_tools() {
  if [ "$(uname -s)" = "Darwin" ]; then

    if xcode-select -p &>/dev/null; then
      echo "Xcode Command Line Tools are already installed."
      read -p "Do you want to remove and reinstall Xcode Command Line Tools to ensure they are up-to-date? (y/n): " reinstall_xcode_clt
      if [ "$reinstall_xcode_clt" = "y" ]; then
        echo "Removing old Xcode Command Line Tools..."
        sudo rm -rf /Library/Developer/CommandLineTools
        echo "Reinstalling Xcode Command Line Tools..."
        xcode-select --install
      fi
    else
      echo "Installing Xcode Command Line Tools..."
      xcode-select --install
    fi

    if ! command -v brew &> /dev/null; then
      echo "Homebrew not found, installing..."
      arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
      echo "Homebrew is already installed."
    fi

    # Use Rosetta to install x86_64 versions of packages
    if ! arch -x86_64 /usr/local/bin/brew list cmake &>/dev/null; then
      echo "Installing cmake..."
      arch -x86_64 /usr/local/bin/brew install cmake
    else
      echo "cmake is already installed."
    fi

    if ! arch -x86_64 /usr/local/bin/brew list ninja &>/dev/null; then
      echo "Installing ninja..."
      arch -x86_64 /usr/local/bin/brew install ninja
    else
      echo "ninja is already installed."
    fi

    if ! arch -x86_64 /usr/local/bin/brew list pkg-config &>/dev/null; then
      echo "Installing pkg-config..."
      arch -x86_64 /usr/local/bin/brew install pkg-config
    else
      echo "pkg-config is already installed."
    fi

    if ! arch -x86_64 /usr/local/bin/brew list openssl@1.1 &>/dev/null; then
      echo "Installing openssl@1.1..."
      arch -x86_64 /usr/local/bin/brew install openssl@1.1
    else
      echo "openssl@1.1 is already installed."
    fi

    if ! arch -x86_64 /usr/local/bin/brew list xz &>/dev/null; then
      echo "Installing xz..."
      arch -x86_64 /usr/local/bin/brew install xz
    else
      echo "xz is already installed."
    fi

    echo "Adding OpenSSL, pkgconf and xz environment variables to $SHELL_ENV_FILE (if they don't exist)..."

    if ! grep -q 'export LIBRARY_PATH="$LIBRARY_PATH:/usr/local/opt/openssl@1.1/lib:/usr/local/opt/xz/lib"' "$SHELL_ENV_FILE"; then
      echo 'export LIBRARY_PATH="$LIBRARY_PATH:/usr/local/opt/openssl@1.1/lib:/usr/local/opt/xz/lib"' >> "$SHELL_ENV_FILE"
    fi

    if ! grep -q 'export CPATH="$CPATH:/usr/local/opt/openssl@1.1/include:/usr/local/opt/xz/include"' "$SHELL_ENV_FILE"; then
      echo 'export CPATH="$CPATH:/usr/local/opt/openssl@1.1/include:/usr/local/opt/xz/include"' >> "$SHELL_ENV_FILE"
    fi

    if ! grep -q 'export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:/usr/local/opt/openssl@1.1/lib/pkgconfig:/usr/local/opt/xz/lib/pkgconfig"' "$SHELL_ENV_FILE"; then
      echo 'export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:/usr/local/opt/openssl@1.1/lib/pkgconfig:/usr/local/opt/xz/lib/pkgconfig"' >> "$SHELL_ENV_FILE"
    fi

    if ! grep -q 'export PATH="/usr/local/opt/openssl@1.1/bin:$PATH"' "$SHELL_ENV_FILE"; then
      echo 'export PATH="/usr/local/opt/openssl@1.1/bin:$PATH"' >> "$SHELL_ENV_FILE"
    fi

    # Update rust target
    if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
      echo "x86_64-apple-darwin target not found, installing..."
      rustup target add x86_64-apple-darwin
    fi

    # Update the environment variables for the current session
    export CARGO_BUILD_TARGET="x86_64-apple-darwin"
    export LIBRARY_PATH="$LIBRARY_PATH:/usr/local/opt/openssl@1.1/lib:/usr/local/opt/xz/lib"
    export CPATH="$CPATH:/usr/local/opt/openssl@1.1/include:/usr/local/opt/xz/include"
    export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:/usr/local/opt/openssl@1.1/lib/pkgconfig:/usr/local/opt/xz/lib/pkgconfig"
    export PATH="/usr/local/opt/openssl@1.1/bin:$PATH"
    export RUSTFLAGS="-L/usr/lib/libiconv"

    source "$SHELL_ENV_FILE"
  fi
}

prompt_for_shell() {
  echo "Please select your shell:"
  echo "1) bash"
  echo "2) zsh"
  echo "3) fish"
  echo "4) other"
  read -p "Enter the number corresponding to your shell: " shell_choice

  case $shell_choice in
    1)
      SHELL_ENV_FILE="$HOME/.bashrc"
      ;;
    2)
      SHELL_ENV_FILE="$HOME/.zshenv"
      ;;
    3)
      SHELL_ENV_FILE="$HOME/.config/fish/config.fish"
      ;;
    4)
      read -p "Please enter the path to your shell's environment file: " SHELL_ENV_FILE
      ;;
    *)
      echo "Invalid choice. Defaulting to zsh."
      SHELL_ENV_FILE="$HOME/.zshenv"
      ;;
  esac
}

# Function to confirm deletion of a directory
confirm_deletion() {
  local dir=$1
  if [ -d "$dir" ]; then
    read -p "Directory $dir exists. Do you want to delete it and continue? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
      rm -rf "$dir"
      echo "Deleted $dir."
    else
      echo "Aborted."
      exit 1
    fi
  fi
}

clean_build_artifacts() {
  local project_dir=$1
  echo "Cleaning previous build artifacts in $project_dir..."
  cd "$project_dir"
  cargo clean
}
