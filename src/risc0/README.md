# RISC Zero Rust

## Setup

Run the `./setup.sh risc0` command from within the `proof-generator` directory.

## Create A Proof

1. Initial Build
```
cargo build --release
```
2. Run against compiled binary without specifying output filename, it will generate a timestamped file in the data directory containing the data required for zkVerify
```
./target/release/prove --a 17 --b 23
```
3. Specify a file to output proof inputs to
```
./target/release/prove --a 17 --b 23 --output ${filepath}
## Verify A Proof (Using risc0)

```
cargo run --release --bin verify
```

## Verify A Proof (Using zkVerify)