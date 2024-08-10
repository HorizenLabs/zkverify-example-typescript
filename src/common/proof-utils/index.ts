import path from 'path';
import * as fs from 'fs';
import * as nodeCrypto from 'crypto';
import { exec } from 'child_process';

/**
 * Dynamically loads and returns the proof handler for the specified proof type.
 *
 * @param {string} proofType - The type of the proof for which to load the handler.
 * @returns {Promise<any>} - A promise that resolves to the proof handler.
 * @throws {Error} - Throws an error if the proof handler cannot be loaded.
 */
export async function getProofHandler(proofType: string): Promise<any> {
    try {
        const handlerPath = path.join(__dirname, '../..', proofType, 'handler');
        const handler = await import(handlerPath);
        return handler.default;
    } catch (error) {
        throw new Error(`Failed to load proof handler for type: ${proofType}`);
    }
}


/**
 * Writes the input JSON file to a unique filename with a timestamp in the data folder.
 *
 * @param {string} proofType - The type of proof.
 * @param {object} inputJson - The input JSON object.
 * @param {string} timestamp - The timestamp to use for the filename.
 * @returns {string} The unique filename created.
 */
export function writeInputJsonFile(proofType: string, inputJson: object, timestamp: string): string {
    const dataDir = path.join(__dirname, `../../${proofType}/circuit/data`);

    fs.mkdirSync(dataDir, { recursive: true });

    const uniqueFilename = path.join(dataDir, `input-${timestamp}.json`);
    fs.writeFileSync(uniqueFilename, JSON.stringify(inputJson, null, 2));

    return uniqueFilename;
}

/**
 * Generates a witness file for the zk-SNARK proof using the custom generate_witness.js script.
 *
 * @param {string} circuitWasm - The path to the circuit WASM file.
 * @param {string} inputFilePath - The path to the input JSON file.
 * @param {string} witnessFilePath - The path to the witness file to be generated.
 * @returns {Promise<void>} A promise that resolves when the witness file is generated.
 * @throws {Error} If the witness file is not found after generation.
 */
export async function generateWitness(circuitWasm: string, inputFilePath: string, witnessFilePath: string): Promise<void> {
    const generateWitnessScript = path.join(path.dirname(circuitWasm), 'generate_witness.js');
    const cmd = `node ${generateWitnessScript} ${circuitWasm} ${inputFilePath} ${witnessFilePath}`;

    return new Promise<void>((resolve, reject) => {
        exec(cmd, (error: any, stdout: string, stderr: string) => {
            if (error) {
                console.error("Error generating witness:", stderr);
                reject(`Error generating witness: ${stderr}`);
                return;
            }

            if (!fs.existsSync(witnessFilePath)) {
                reject(`Witness file not found at ${witnessFilePath}`);
                return;
            }
            resolve();
        });
    });
}
