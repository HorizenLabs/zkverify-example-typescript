import 'dotenv/config';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Keyring } from '@polkadot/keyring';
import { proofs } from './proofs';
import { createApi, waitForNodeToSync } from './helpers';
import { handleTransaction } from './transactions';

/**
 * Validates required environment variables.
 * @param variables - An array of required environment variable names.
 */
const validateEnvVariables = (variables: string[]): void => {
    variables.forEach(envVar => {
        if (!process.env[envVar]) {
            throw new Error(`Required environment variable ${envVar} is not set.`);
        }
    });
};

/**
 * Constructs a proof extrinsic.
 * @param api - The ApiPromise instance.
 * @param pallet - The pallet to which the proof is submitted.
 * @param params - The parameters for the proof submission.
 * @returns The constructed extrinsic object.
 */
const constructProofExtrinsic = (api: ApiPromise, pallet: string, params: any[]): SubmittableExtrinsic<"promise"> => {
    return api.tx[pallet].submitProof(...params);
};

/**
 * Validates the proof type argument and returns the corresponding pallet and params.
 * @param proofType - The proof type provided as an argument.
 * @returns The corresponding pallet and params.
 */
const getProofDetails = (proofType: string) => {
    const proof = proofs[proofType];
    if (!proof) {
        throw new Error(`Proof type ${proofType} is not valid or not provided.`);
    }
    return proof;
};

/**
 * Main function to execute the proof submission.
 */
const main = async (): Promise<void> => {
    validateEnvVariables(['WEBSOCKET', 'PRIVATE_KEY']);

    const provider = new WsProvider(process.env.WEBSOCKET as string);
    const api = await createApi(provider);
    await waitForNodeToSync(api);

    const timerRefs = { interval: null as NodeJS.Timeout | null, timeout: null as NodeJS.Timeout | null };
    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromUri(process.env.PRIVATE_KEY as string);

    const { pallet, params } = getProofDetails(process.argv[2]);

    console.log(`Constructing proof extrinsic...`);
    const extrinsic = constructProofExtrinsic(api, pallet, params);
    const startTime = Date.now();

    try {
        const result = await handleTransaction(api, extrinsic, account, process.argv[2], startTime, timerRefs);
        console.log(`Transaction result: ${result}`);
    } catch (error) {
        console.error(`Error sending proof:`, error);
    } finally {
        await api.disconnect();
        await provider.disconnect();
    }
};

main().catch(error => {
    console.error('Unhandled error in main function:', error);
    process.exit(1);
});
