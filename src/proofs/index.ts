import { fflonkProofData } from '../data/fflonk';
import { boojumProofData } from '../data/boojum';
import { risc0ProofData } from '../data/risc0';
import { groth16ProofData } from '../data/groth16';

/**
 * Interface representing the structure of proofs.
 */
export interface Proofs {
    [key: string]: {
        pallet: string;
        params: any[];
    };
}

/**
 * Collection of proof configurations for different types.
 */
export const proofs: Proofs = {
    fflonk: {
        pallet: 'settlementFFlonkPallet',
        params: [
            { 'Vk': fflonkProofData.vk },
            fflonkProofData.proof,
            fflonkProofData.pubs
        ],
    },
    boojum: {
        pallet: 'settlementZksyncPallet',
        params: [
            { 'Vk': boojumProofData.vk },
            boojumProofData.proof,
            boojumProofData.pubs
        ]
    },
    risc0: {
        pallet: 'settlementRisc0Pallet',
        params: [
            { 'Vk': risc0ProofData.vk },
            risc0ProofData.proof,
            risc0ProofData.pubs
        ]
    },
    groth16: {
        pallet: 'settlementGroth16Pallet',
        params: [
            { 'Vk': groth16ProofData.vk },
            groth16ProofData.proof,
            groth16ProofData.pubs
        ]
    }
};
