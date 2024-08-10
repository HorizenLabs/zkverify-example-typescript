import * as fs from "fs";
import * as path from "path";
import BN from "bn.js";
import { ProofData, ProofHandler } from "../../types";
import { generateWitness, writeInputJsonFile } from "../proof-utils";
import { randomBytes } from "crypto";

abstract class SnarkHandler implements ProofHandler {
    abstract formatProof(proof: any, publicSignals?: string[]): any;
    abstract formatVk(vkJson: any): any;
    abstract formatPubs(pubs: string[]): any;
    abstract verifyProof(vk: any, proof: any, publicSignals: any): Promise<boolean>;

    async generateProof(inputs: any): Promise<ProofData<any>> {
        const proofType = this.getProofType();
        const proveMethod = this.getProveMethod();
        const verifyMethod = this.getVerifyMethod();

        return this.proveAndVerify(proofType, inputs, proveMethod, verifyMethod);
    }

    abstract getProofType(): string;
    abstract getProveMethod(): (provingKey: string, witnessFilePath: string) => Promise<{ proof: any; publicSignals: any }>;
    abstract getVerifyMethod(): (vk: any, publicSignals: any, proof: any) => Promise<boolean>;

    generateUniqueInput(): { a: string; b: string } {
        const generateRandom128BitNumber = (): BN => {
            const randomBytesArray = randomBytes(16);
            return new BN(randomBytesArray, 16);
        };

        const a = generateRandom128BitNumber();
        const b = generateRandom128BitNumber();

        return { a: "0x" + a.toString(16), b: "0x" + b.toString(16) };
    }

    protected checkFilesExistence(circuitWasm: string, provingKey: string, verificationKeyPath: string): void {
        if (!fs.existsSync(circuitWasm)) {
            throw new Error(`Circuit WASM file not found at ${circuitWasm}`);
        }
        if (!fs.existsSync(provingKey)) {
            throw new Error(`Proving key file not found at ${provingKey}`);
        }
        if (!fs.existsSync(verificationKeyPath)) {
            throw new Error(`Verification key file not found at ${verificationKeyPath}`);
        }
    }

    protected async generateProofFiles(proofType: string, inputs: any): Promise<{ witnessFilePath: string; inputFilePath: string }> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const inputFilePath = writeInputJsonFile(proofType, inputs, timestamp);
        const witnessFilePath = path.join(__dirname, `../../${proofType}/circuit/data`, `witness-${timestamp}.wtns`);
        await generateWitness(this.getCircuitWasmPath(proofType), inputFilePath, witnessFilePath);
        return { witnessFilePath, inputFilePath };
    }

    protected getCircuitWasmPath(proofType: string): string {
        return path.join(__dirname, `../../${proofType}/circuit/circuit_js/circuit.wasm`);
    }

    protected getProvingKeyPath(proofType: string): string {
        return path.join(__dirname, `../../${proofType}/circuit/zkey/circuit_final.zkey`);
    }

    protected getVerificationKeyPath(proofType: string): string {
        return path.join(__dirname, `../../${proofType}/circuit/zkey/verification_key.json`);
    }

    protected async proveAndVerify(proofType: string, inputs: any, proveMethod: (provingKey: string, witnessFilePath: string) => Promise<{ proof: any; publicSignals: any }>, verifyMethod: (vk: any, publicSignals: any, proof: any) => Promise<boolean>): Promise<ProofData<any>> {
        const circuitWasm = this.getCircuitWasmPath(proofType);
        const provingKey = this.getProvingKeyPath(proofType);
        const verificationKeyPath = this.getVerificationKeyPath(proofType);

        this.checkFilesExistence(circuitWasm, provingKey, verificationKeyPath);

        const { witnessFilePath } = await this.generateProofFiles(proofType, inputs);

        const { proof, publicSignals } = await proveMethod(provingKey, witnessFilePath);
        const vkJson = JSON.parse(fs.readFileSync(verificationKeyPath, "utf8"));

        const isValid = await verifyMethod(vkJson, publicSignals, proof);
        if (!isValid) {
            throw new Error(`Generated ${proofType} proof is invalid`);
        }

        const formattedProof = this.formatProof(proof, publicSignals);
        const formattedPublicSignals = this.formatPubs(publicSignals);
        const formattedVk = this.formatVk(vkJson);

        return {
            proof: formattedProof,
            publicSignals: formattedPublicSignals,
            vk: formattedVk,
        };
    }
}

export default SnarkHandler;
