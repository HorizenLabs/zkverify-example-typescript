# Boojum Proof Generation and Verification Script

## Overview

This script uses the `era-boojum` repository code to generate and verify cryptographic proofs based on a specific arithmetic circuit. The circuit performs a series of mathematical operations on the provided inputs, and the script generates a proof that these operations were executed correctly.

### Circuit and Inputs

The script constructs a constraint system where the circuit is defined to perform the following operations:

1. **Input Allocation**: Two inputs, `x` and `y`, are provided by the user as either `int` or `u64`.
2. **Intermediate Computations**:
    - Compute `a = x * x` (the square of `x`).
    - Compute `b = x * y` (the product of `x` and `y`).
    - Compute `c = a - b` (the difference between `a` and `b`).
    - Compute `z = y + 1` (a derived constant based on `y`).
    - Compute `result = c + z` (the final result of the computation).

The inputs to the circuit are:
- `x`: First input value.
- `y`: Second input value.

The script generates a proof to demonstrate that the calculations performed by the circuit are correct, given the inputs. The verification process ensures that the proof is valid and that the computations match the expected result.

## Prerequisites

- "./setup.sh boojum" has been run from the proof-generator directory

## Build

```shell
cargo build --release  
```

## Generate and Verify Proof

```shell
cargo run --release -- 1 2
```

## View Outputs

Data is stored in the boojum/data directory for each run.