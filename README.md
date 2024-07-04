# zkVerify TypeScript  Example

## Pre-requisites

1. Install necessary Node.js dependencies:

```bash
npm install
```

2. Update the .env.testnet to have the correct Websocket URL and your wallet private key

## Submit a Proof

Send a supported proof by running the following and specifying the proof type

```shell
ts-node ./src/index fflonk
```

Or via npm:

```shell
npm run fflonk
```

## Supported Proof Types

- fflonk
- boojum
- groth16
- risc0

## Project Layout

### data

contains an example data file containing a valid proof and its inputs for each supported proof type

### helpers

functions to check events caused by the submission of a proof

### proofs

Exports a collection of supported proofs. Each proof type is associated with a specific pallet and its corresponding proof data.

### transactions

Handles the sending of a proof as an extrinsic to the zkVerify network and code related to block inclusion and finalization.