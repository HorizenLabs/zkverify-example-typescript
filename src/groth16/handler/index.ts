import SnarkHandler from "../../common/snark-handler";
import { Proof, ProofInner } from "../../types";
import {
    formatProof as formatGroth16Proof,
    formatPubs as formatGroth16Pubs,
    formatVk as formatGroth16Vk
} from "../utils";

const snarkjs = require("snarkjs");

class Groth16Handler extends SnarkHandler {
    formatProof(proof: any, publicSignals: string[]): Proof<ProofInner> {
        return formatGroth16Proof(proof);
    }

    formatVk(vkJson: any): any {
        return formatGroth16Vk(vkJson);
    }

    formatPubs(pubs: string[]): string[] {
        return formatGroth16Pubs(pubs);
    }

    getProofType(): string {
        return "groth16";
    }

    getProveMethod(): (provingKey: string, witnessFilePath: string) => Promise<{ proof: any; publicSignals: any }> {
        return snarkjs.groth16.prove;
    }

    getVerifyMethod(): (vk: any, publicSignals: any, proof: any) => Promise<boolean> {
        return snarkjs.groth16.verify;
    }

    async verifyProof(vkJson: any, proof: any, publicSignals: any): Promise<boolean> {
        return await snarkjs.groth16.verify(vkJson, publicSignals, proof);
    }
}

export default new Groth16Handler();
