import 'dotenv/config';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { AccountInfo } from '@polkadot/types/interfaces';
import { proofs } from './proofs';
import { createApi, waitForNodeToSync } from './helpers';
import { handleTransaction } from './transactions';

/**
 * Validates required environment variables.
 * @param variables - An array of required environment variable names.
 */
const validateEnvVariables = (variables: string[]): void => {
    variables.forEach(envVar => {
        const value = process.env[envVar];
        if (!value || value === 'INSERT_PRIVATE_KEY_PHRASE') {
            console.error(`Required environment variable ${envVar} is not set or is set to the default value.`);
            process.exit(1);
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
const constructProofExtrinsic = (api: ApiPromise, pallet: string, params: any[]): SubmittableExtrinsic<'promise'> => {
    return api.tx[pallet].submitProof(...params);
};

/**
 * Validates the proof type argument and returns the corresponding pallet and params.
 * @param proofType - The proof type provided as an argument.
 * @returns The corresponding pallet and params.
 */
const getProofDetails = (proofType: string) => {
    if (!proofType) {
        console.error('Proof type is not provided.');
        process.exit(1);
    }
    const proof = proofs[proofType];
    if (!proof) {
        console.error(`Proof type ${proofType} is not valid.`);
        process.exit(1);
    }
    return proof;
};

/**
 * Creates and validates the keyring account.
 * @param keyring - The keyring instance.
 * @param api - The ApiPromise instance.
 * @returns {Promise<KeyringPair>} - The created account.
 */
const createAndValidateAccount = async (keyring: Keyring, api: ApiPromise): Promise<KeyringPair> => {
    let account: KeyringPair;
    try {
        account = keyring.addFromUri(process.env.PRIVATE_KEY as string);
    } catch (error) {
        console.error('Failed to open the wallet. Please check the PRIVATE_KEY value.', (error as Error).message);
        process.exit(1);
    }

    // Check account balance
    const { address } = account;
    const accountInfo = await api.query.system.account(address) as AccountInfo;
    const balance = accountInfo.data.free;
    if (balance.isZero()) {
        console.error('The account has insufficient funds.');
        process.exit(1);
    }

    return account;
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
    const account = await createAndValidateAccount(keyring, api);

    const proofType = process.argv[2];
    const { pallet, params } = getProofDetails(proofType);

    console.log(`Constructing ${proofType} proof extrinsic...`);
    const extrinsic = constructProofExtrinsic(api, pallet, params);
    const startTime = Date.now();

    try {
        const result = await handleTransaction(api, extrinsic, account, proofType, startTime, timerRefs);
        console.log(`Transaction result: ${result}`);
    } catch (error) {
        console.error(`Error sending proof:`, (error as Error).message);
    } finally {
        await api.disconnect();
        await provider.disconnect();
    }
};

main().catch(error => {
    console.error('Unhandled error in main function:', (error as Error).message);
    process.exit(1);
});
