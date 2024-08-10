use clap::Parser;
use multiply_methods::{MULTIPLY_ELF, MULTIPLY_ID};
use risc0_zkvm::{default_prover, ExecutorEnv};
use serde_json::json;
use std::fs::{self, File};
use std::path::Path;
use bincode;
use hex;
use chrono::{Local, Datelike, Timelike};

#[derive(Parser)]
#[command(name = "zkVM Prover")]
#[command(about = "A tool to generate a zkSNARK proof using RISC0", long_about = None)]
struct Args {
    /// First value to multiply
    #[arg(short, long)]
    a: u64,

    /// Second value to multiply
    #[arg(short, long)]
    b: u64,

    /// Output filename for JSON data (Optional)
    #[arg(short, long)]
    output: Option<String>,
}

fn main() {
    let args = Args::parse();

    let a: u64 = args.a;
    let b: u64 = args.b;

    println!("Sending values to guest: a = {}, b = {}", a, b);

    let env = create_execution_env(a, b);
    let receipt = run_prover(env);
    let serialized_data = extract_serialized_data(&receipt);
    let output_filename = args.output.unwrap_or_else(|| generate_timestamped_filename());

    save_to_json(&output_filename, &serialized_data);
    decode_and_display_output(&receipt);
}

fn create_execution_env(a: u64, b: u64) -> ExecutorEnv<'static> {
    ExecutorEnv::builder()
        .write(&a).unwrap()
        .write(&b).unwrap()
        .build()
        .unwrap()
}

fn run_prover(env: ExecutorEnv) -> risc0_zkvm::Receipt {
    let prover = default_prover();
    println!("Proving...");
    let receipt = prover.prove(env, MULTIPLY_ELF).unwrap().receipt;
    println!("Receipt received...");
    receipt
}

fn extract_serialized_data(receipt: &risc0_zkvm::Receipt) -> serde_json::Value {
    let receipt_inner_bytes_array = bincode::serialize(&receipt.inner).unwrap();
    let receipt_journal_bytes_array = bincode::serialize(&receipt.journal).unwrap();

    let image_id_hex: String = MULTIPLY_ID.iter()
        .map(|&value| format!("{:08x}", value.to_be()))
        .collect();

    json!({
        "proof": format!("0x{}", hex::encode(receipt_inner_bytes_array)),
        "outputs": format!("0x{}", hex::encode(receipt_journal_bytes_array)),
        "image_id": format!("0x{}", image_id_hex)
    })
}

fn generate_timestamped_filename() -> String {
    let now = Local::now();
    format!(
        "proof_{}-{:02}-{:02}_{:02}-{:02}-{:02}-{:03}.json",
        now.year(),
        now.month(),
        now.day(),
        now.hour(),
        now.minute(),
        now.second(),
        now.timestamp_subsec_millis()
    )
}

fn save_to_json(filename: &str, data: &serde_json::Value) {
    let dir = Path::new("data");
    if !dir.exists() {
        fs::create_dir_all(dir).expect("Failed to create data directory");
    }

    let filepath = dir.join(filename);

    let mut file = File::create(&filepath).expect("Failed to create file");
    serde_json::to_writer_pretty(&mut file, data).expect("Failed to serialize data to JSON");
    println!("Data saved to {:?}", filepath);
}

fn decode_and_display_output(receipt: &risc0_zkvm::Receipt) {
    let output: u128 = receipt.journal.decode().unwrap();
    println!(
        "Hello, world! I generated a proof of guest execution! {} is a public output from the journal",
        output
    );
}
