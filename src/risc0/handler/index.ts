import { ProofData, ProofHandler } from "../../types";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

class Risc0Handler implements ProofHandler {
    formatProof(proof: any): string {
        return JSON.stringify(proof);
    }

    formatVk(vkJson: any): any {
        return vkJson;
    }

    formatPubs(pubs: any[]): string {
        return JSON.stringify(pubs);
    }

    async generateProof(inputs: { a: string; b: string }): Promise<ProofData<any>> {
        const { a, b } = inputs;

        const topLevelDir = path.resolve(__dirname, "../../..");
        const binaryPath = path.join(topLevelDir, "src/risc0/target/release/prove");
        const dataDir = path.join(topLevelDir, "src/risc0/data");

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `proof_${timestamp}.json`;
        const filepath = path.join(dataDir, filename);

        fs.mkdirSync(dataDir, { recursive: true });

        const command = `${binaryPath} --a ${a} --b ${b} --output ${filepath}`;
        await execAsync(command);

        const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

        const proof = data.proof;
        const publicSignals = data.outputs;
        const vk = data.image_id;

        return {
            proof,
            publicSignals,
            vk,
        };
    }

    async verifyProof(vk: any, proof: any, publicSignals: any): Promise<boolean> {
        // TODO: Call native risc0 verifier
        return true;
    }

    generateUniqueInput(): { a: bigint; b: bigint } {
        const randomU64 = (): bigint => {
            const high = Math.floor(Math.random() * 0x100000000);
            const low = Math.floor(Math.random() * 0x100000000);

            return (BigInt(high) << 32n) | BigInt(low);
        };

        const a = randomU64();
        const b = randomU64();

        return { a, b };
    }
}

export default new Risc0Handler();
