#![feature(allocator_api)]

use std::alloc::Global;
use std::env;
use std::fs::{File, create_dir_all};
use std::io::Write;
use chrono::{Utc};
use serde_json::json;
use hex::decode;
use boojum::dag::CircuitResolverOpts;
use boojum::algebraic_props::round_function::AbsorptionModeOverwrite;
use boojum::algebraic_props::sponge::GoldilocksPoseidonSponge;
use boojum::config::DevCSConfig;
use boojum::cs::cs_builder::{new_builder, CsBuilder, CsBuilderImpl};
use boojum::cs::cs_builder_reference::CsReferenceImplementationBuilder;
use boojum::cs::cs_builder_verifier::CsVerifierBuilder;
use boojum::cs::gates::{
    ConstantsAllocatorGate, FmaGateInBaseFieldWithoutConstant, NopGate,
    PublicInputGate, ConstantAllocatableCS,
};
use boojum::cs::implementations::{
    pow::NoPow, prover::ProofConfig, transcript::GoldilocksPoisedonTranscript,
};
use boojum::cs::traits::{cs::ConstraintSystem, gate::GatePlacementStrategy};
use boojum::cs::{CSGeometry, GateConfigurationHolder, Place, StaticToolboxHolder};
use boojum::field::goldilocks::{GoldilocksExt2, GoldilocksField};
use boojum::field::U64Representable;
use boojum::gadgets::num::Num;
use boojum::worker::Worker;

/// Parses input values from hex or integer strings to `u64`.
fn parse_input(input: &str) -> u64 {
    if input.starts_with("0x") {
        hex_to_u64(&input[2..])
    } else {
        input.parse().expect("Invalid integer input")
    }
}

/// Converts a hex string to a `u64` value.
fn hex_to_u64(hex: &str) -> u64 {
    let bytes = decode(hex).expect("Invalid hex string");
    let mut array = [0u8; 8];
    array.copy_from_slice(&bytes[..8]);
    u64::from_be_bytes(array)
}

/// Gets the current timestamp in a human-readable format.
fn get_timestamp() -> String {
    let now = Utc::now();
    now.format("%Y-%m-%d_%H-%M-%S").to_string()
}

fn main() {
    // Get command-line arguments
    let args: Vec<String> = env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: {} <input_a> <input_b>", args[0]);
        std::process::exit(1);
    }

    // Parse inputs
    let x_value = parse_input(&args[1]);
    let y_value = parse_input(&args[2]);

    // Derive z_value from y_value (for variability)
    let z_value = y_value.wrapping_add(1);

    type P = GoldilocksField;
    type F = GoldilocksField;

    // Define the geometry of the constraint system
    let geometry = CSGeometry {
        num_columns_under_copy_permutation: 8,
        num_witness_columns: 1,
        num_constant_columns: 2,
        max_allowed_constraint_degree: 8,
    };

    let max_variables = 512;
    let max_trace_len = 128;

    /// Configures the constraint system builder.
    fn configure<
        T: CsBuilderImpl<F, T>,
        GC: GateConfigurationHolder<F>,
        TB: StaticToolboxHolder,
    >(
        builder: CsBuilder<T, F, GC, TB>,
    ) -> CsBuilder<T, F, impl GateConfigurationHolder<F>, impl StaticToolboxHolder> {
        let builder = ConstantsAllocatorGate::configure_builder(
            builder,
            GatePlacementStrategy::UseGeneralPurposeColumns,
        );
        let builder = FmaGateInBaseFieldWithoutConstant::configure_builder(
            builder,
            GatePlacementStrategy::UseGeneralPurposeColumns,
        );
        let builder =
            NopGate::configure_builder(builder, GatePlacementStrategy::UseGeneralPurposeColumns);

        let builder = PublicInputGate::configure_builder(
            builder,
            GatePlacementStrategy::UseGeneralPurposeColumns,
        );

        builder
    }

    // Generate a timestamp for file naming
    let timestamp = get_timestamp();

    // Initialize the constraint system builder
    let builder_impl = CsReferenceImplementationBuilder::<F, P, DevCSConfig>::new(
        geometry,
        max_trace_len,
    );
    let builder = new_builder::<_, F>(builder_impl);

    let builder = configure(builder);
    let mut cs = builder.build(CircuitResolverOpts::new(max_variables));

    // Allocate input values and add them to the public inputs
    let x = cs.alloc_single_variable_from_witness(GoldilocksField::from_u64_unchecked(x_value));
    let y = cs.alloc_single_variable_from_witness(GoldilocksField::from_u64_unchecked(y_value));

    let public_input_gate_x = PublicInputGate::new(x.into());
    public_input_gate_x.add_to_cs(&mut cs);

    let public_input_gate_y = PublicInputGate::new(y.into());
    public_input_gate_y.add_to_cs(&mut cs);

    let x = Num::<F>::from_variable(x);
    let y = Num::<F>::from_variable(y);
    let z = Num::from_variable(cs.allocate_constant(F::from_u64_unchecked(z_value)));

    // Define the circuit
    let a = x.mul(&mut cs, &x); // a = x * x
    let b = x.mul(&mut cs, &y); // b = x * y
    let c = a.sub(&mut cs, &b); // c = a - b
    let result = c.add(&mut cs, &z); // result = c + z

    // Add the result to the public inputs
    let result = result.get_variable();
    let public_input_gate = PublicInputGate::new(result);
    public_input_gate.add_to_cs(&mut cs);

    // Get the result value
    let result = cs.get_value(Place::from_variable(result)).wait().unwrap()[0];
    println!("result = {}", result);

    // Optional: pad and shrink the circuit
    cs.pad_and_shrink();

    let worker = Worker::new_with_num_threads(1);

    // Transform the constraint system into an assembly
    let cs = cs.into_assembly::<Global>();

    // Configure proof generation settings
    let lde_factor_to_use = 32;
    let mut proof_config = ProofConfig::default();
    proof_config.fri_lde_factor = lde_factor_to_use;
    proof_config.pow_bits = 0;

    // Generate the proof and verification key
    let (proof, vk) = cs.prove_one_shot::<
        GoldilocksExt2,
        GoldilocksPoisedonTranscript,
        GoldilocksPoseidonSponge<AbsorptionModeOverwrite>,
        NoPow,
    >(&worker, proof_config, ());

    // Create the data directory if it does not exist
    create_dir_all("data").expect("Unable to create data directory");

    // Serialize proof to JSON and write to data/proof_TIMESTAMP.json
    let proof_json = json!(proof);
    let mut proof_file = File::create(format!("data/proof_{}.json", timestamp)).expect("Unable to create data/proof.json");
    writeln!(proof_file, "{}", proof_json).expect("Unable to write to data/proof.json");

    // Serialize verification key to JSON and write to data/vk_TIMESTAMP.json
    let vk_json = json!(vk);
    let mut vk_file = File::create(format!("data/vk_{}.json", timestamp)).expect("Unable to create data/vk.json");
    writeln!(vk_file, "{}", vk_json).expect("Unable to write to data/vk.json");

    // Serialize public inputs to JSON and write to data/public_TIMESTAMP.json
    let public_inputs_json = json!(proof.public_inputs);
    let mut pubs_file = File::create(format!("data/public_{}.json", timestamp)).expect("Unable to create data/public.json");
    writeln!(pubs_file, "{}", public_inputs_json).expect("Unable to write to data/public.json");

    println!("Proof, verification key, and public inputs have been generated in the data directory.");

    // Verification process
    let builder_impl = CsVerifierBuilder::<F, GoldilocksExt2>::new_from_parameters(geometry);
    let builder = new_builder::<_, F>(builder_impl);

    let builder = configure(builder);
    let verifier = builder.build(());

    // Verify the proof
    let is_valid = verifier.verify::<
        GoldilocksPoseidonSponge<AbsorptionModeOverwrite>,
        GoldilocksPoisedonTranscript,
        NoPow
    >(
        (),
        &vk,
        &proof,
    );

    println!("Is the proof valid? {}", is_valid);
}
