use multiply_methods::MULTIPLY_ID;
use risc0_zkvm::Receipt;

fn main(){
    let receipt_path ="./receipt.bin".to_string();
    let receipt_file = std::fs::read(receipt_path).unwrap();

    let receipt = bincode::deserialize::<Receipt>(&receipt_file).unwrap();

    let _verification = match receipt.verify(MULTIPLY_ID){
        Ok(()) => println!("Proof is Valid"),
        Err(_) => println!("Something went wrong !!"),
    };
}