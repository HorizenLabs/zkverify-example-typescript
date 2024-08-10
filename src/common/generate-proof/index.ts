import { ProofData } from "../../types";
import { getProofHandler } from "../proof-utils";

/**
 * Main function to generate and verify a zk-SNARK proof natively.
 *
 * @param {string} proofType - The type of proof to generate.
 * @returns {Promise<ProofData<any>>} A promise that resolves to the generated proof data.
 * @throws {Error} If any required file is not found.
 */
export async function generateAndNativelyVerifyProof(proofType: string): Promise<ProofData<any>> {
    const handler = await getProofHandler(proofType);
    const inputs = handler.generateUniqueInput();

    const { proof, publicSignals, vk } = await handler.generateProof(inputs);

    return {
        proof: proof,
        publicSignals: publicSignals,
        vk: vk
    };
}
