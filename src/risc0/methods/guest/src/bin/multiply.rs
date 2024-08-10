#![no_main]
#![no_std]

use risc0_zkvm::guest::env;
risc0_zkvm::guest::entry!(main);

pub fn main() {
    let a: u64 = env::read();
    let b: u64 = env::read();

    if a == 1 || b == 1 {
        panic!("Trivial factors !!")
    }

    let product: u128 = (a as u128) * (b as u128);

    env::commit(&product);
}
