export interface ProofInner {
    a: string;
    b: string;
    c: string;
}

export type ProofType<T> = ProofInner | T | string;

export interface Proof<T> {
    curve?: string;
    proof: ProofType<T>;
}

export interface ProofData<T> {
    proof: T;
    publicSignals: string | string[];
    vk?: any;
}

export interface ProofHandler {
    formatProof(proof: any, publicSignals?: string[]): any;
    formatVk(vkJson: any): any;
    formatPubs(pubs: string[]): any;
    generateProof(inputs: any): Promise<ProofData<any>>;
    verifyProof(vk: any, proof: any, publicSignals: any): Promise<boolean>;
    generateUniqueInput(): any;
}
