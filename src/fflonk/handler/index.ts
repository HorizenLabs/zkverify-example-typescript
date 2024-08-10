import SnarkHandler from "../../common/snark-handler";
import { FflonkVerificationKey } from "../types";
import { formatProof as formatFflonkProof, formatPubs as formatFflonkPubs, formatVk as formatFflonkVk } from "../utils";

const snarkjs = require("snarkjs");

class FflonkHandler extends SnarkHandler {
    formatProof(proof: any, publicSignals: string[]): string {
        return formatFflonkProof(proof);
    }

    formatVk(vkJson: any): FflonkVerificationKey {
        return formatFflonkVk(vkJson);
    }

    formatPubs(pubs: string[]): string {
        return formatFflonkPubs(pubs);
    }

    getProofType(): string {
        return "fflonk";
    }

    getProveMethod(): (provingKey: string, witnessFilePath: string) => Promise<{ proof: any; publicSignals: any }> {
        return snarkjs.fflonk.prove;
    }

    getVerifyMethod(): (vk: any, publicSignals: any, proof: any) => Promise<boolean> {
        return snarkjs.fflonk.verify;
    }

    async verifyProof(vkJson: any, proof: any, publicSignals: any): Promise<boolean> {
        return await snarkjs.fflonk.verify(vkJson, publicSignals, proof);
    }
}

export default new FflonkHandler();
