# Proof Generation and Submission Script

Generate unique proofs and submit them to zkVerify.

This project contains simple Multiplication examples for each supported proof type, accepting 2 numbers as inputs and returning a result.

Generated proofs are then sent to zkVerify for verification.

## Pre-requisites

1. Before you begin, ensure you have the following tools installed globally on your system:

- **snarkjs**: This is a JavaScript library for generating and verifying zk-SNARK proofs.
```sh
npm install -g snarkjs
```
- **Rust**: Ensure you have Rust and Cargo installed. If you don't have Rust installed, you can install it using the following command (change the .zshrc as required):
```sh
cd
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup self update
rustup update stable
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
```
- **circom**: Install circom on your machine, this is a circuit compiler for zk-SNARKs.
```sh
cd
git clone https://github.com/iden3/circom.git ~/circom
cd ~/circom
cargo build --release
```
Export the path:
```sh
cd
echo 'export PATH="$PATH:$HOME/circom/target/release"' >> ~/.zshrc 
source ~/.zshrc
```
Verify the installation:
```sh
circom --version
```

2. Update the .env.testnet file values, in particular ensure you added your SEED PHRASE

3. Get some zkVerify testnet tokens by asking in [Discord](https://discord.gg/Bj5uf2h9])

4. View proof specific README e.g. src/risc0/README.md

## Setup

1. Install dependencies:
   Run the following command from the top-level directory of the project:
```sh
npm install
```

## Types

Each proof type has a types.ts within its directory that shows the structure of the proof data and its handler for converting a proof into the required format.

## Proof Specific Setup

Run the necessary setup scripts for the proof type, e.g. the risc0 will generate the required target folder used in the risc0 handler:

```sh
./setup.sh risc0
./setup.sh groth16
./setup.sh fflonk
./setup.sh boojum
```

### Generating and sending a single unique proof

1. Via package.json (requires `proofType` arg. An optional `skipWaitingForAttestationEventBoolean` can be added and set to true which will not wait for the attestation emitted by zkVerify, useful if sending many proofs concurrently.) Default is false if not provided.
```shell
npm run generate:single:proof -- fflonk
```
2. Run the file directly with ts-node
```shell
npx ts-node src/send-proof/index.ts <proofType> <skipWaitingForAttestationEventBoolean>
```

### Proof Conversion - Making your proof compatible with zkVerify

The logic for converting proofs into a format accepted by zkVerify can be viewed in each of the proofs `handler` index.ts.

For example `src/risc0/handler/index.ts`

## Notes
- Ensure your .env file is set up with the required environment variables:

*WEBSOCKET*: The WebSocket endpoint of your Substrate node.
*SEED_PHRASE*: The seed phrase of the account used for submitting transactions.

