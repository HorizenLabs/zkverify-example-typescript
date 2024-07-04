import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { handleEvents, waitForNewAttestation } from '../helpers';

/**
 * Clears timeout and interval resources.
 * @param timerRefs - An object containing interval and timeout references.
 */
export const clearResources = (timerRefs: { interval: NodeJS.Timeout | null, timeout: NodeJS.Timeout | null }) => {
    if (timerRefs.interval) clearInterval(timerRefs.interval);
    if (timerRefs.timeout) clearTimeout(timerRefs.timeout);
};

/**
 * Handles events when a transaction is included in a block.
 * @param events - The events emitted.
 * @param proofType - The type of the proof.
 * @param startTime - The start time of the transaction.
 * @param blockHash - The hash of the block containing the transaction.
 * @param setAttestationId - Callback to set the attestation ID.
 */
const handleInBlock = (
    events: any[],
    proofType: string,
    startTime: number,
    blockHash: string,
    setAttestationId: (id: string) => void
) => {
    console.log(`Transaction for proof type ${proofType} included in block ${blockHash} (elapsed time: ${(Date.now() - startTime) / 1000} seconds).`);

    handleEvents(events, (data) => {
        if (data && data.length > 1) {
            setAttestationId(data[1].toString());
            console.log(`${proofType} Proof Verified:\n  - Attestation Id: ${data[1].toString()}\n  - Proof Leaf: ${data[0].toString()}`);
        }
    });
};

/**
 * Handles the finalization of a transaction.
 * @param proofType - The type of the proof.
 * @param attestationId - The attestation ID.
 * @param dispatchError - Any dispatch error that occurred.
 * @param api - The ApiPromise instance.
 * @param startTime - The start time of the transaction.
 * @returns A promise that resolves to a string indicating the result.
 */
const handleFinalized = async (
    proofType: string,
    attestationId: string | null,
    dispatchError: any,
    api: ApiPromise,
    startTime: number
): Promise<string> => {
    console.log(`Transaction for proof type ${proofType} finalized (elapsed time: ${(Date.now() - startTime) / 1000} seconds).`);

    if (dispatchError) {
        throw new Error(`Unexpected error during finalization: ${dispatchError.toString()}`);
    }

    if (attestationId) {
        const eventData = await waitForNewAttestation(api, 360000, attestationId, startTime);
        const [id, proofsAttestation] = eventData;

        if (Number.isInteger(id) && /^0x[a-fA-F0-9]{64}$/.test(proofsAttestation)) {
            return 'succeeded';
        } else {
            throw new Error('Invalid attestation data.');
        }
    } else {
        throw new Error('No attestation ID found.');
    }
};

/**
 * Main function to handle transaction submission and finalization.
 * @param api - The ApiPromise instance.
 * @param submitProof - The SubmittableExtrinsic instance representing the proof submission.
 * @param account - The KeyringPair account to use for signing the transaction.
 * @param proofType - The type of the proof.
 * @param startTime - The start time of the transaction.
 * @param timerRefs - An object containing interval and timeout references.
 * @returns A promise that resolves to a string indicating the result.
 */
export const handleTransaction = async (
    api: ApiPromise,
    submitProof: SubmittableExtrinsic<"promise">,
    account: KeyringPair,
    proofType: string,
    startTime: number,
    timerRefs: { interval: NodeJS.Timeout | null, timeout: NodeJS.Timeout | null }
): Promise<string> => {
    let attestationId: string | null = null;

    const setAttestationId = (id: string) => {
        attestationId = id;
    };

    return new Promise((resolve, reject) => {
        let isFinalized = false;

        // Set timeout for transaction finalization
        timerRefs.timeout = setTimeout(() => {
            clearResources(timerRefs);
            reject(new Error(`Timeout: Waiting for ${proofType} proof transaction finalization exceeded 60 seconds.`));
        }, 60000);

        // Sign and send the transaction
        console.log(`Sending ${proofType} Transaction...`)
        submitProof.signAndSend(account, async ({ events, status, dispatchError }) => {
            try {
                if (status.isInBlock) {
                    handleInBlock(events, proofType, startTime, status.asInBlock.toString(), setAttestationId);

                    // Set interval to log waiting status
                    timerRefs.interval = setInterval(() => {
                        if (!isFinalized) {
                            const elapsed = (Date.now() - startTime) / 1000;
                            console.log(`Waiting for ${proofType} transaction to finalize... (elapsed time: ${elapsed} seconds)`);
                        }
                    }, 5000);
                }

                if (status.isFinalized) {
                    isFinalized = true;
                    clearResources(timerRefs);
                    const result = await handleFinalized(proofType, attestationId, dispatchError, api, startTime);
                    resolve(result);
                }
            } catch (error) {
                clearResources(timerRefs);
                console.error(`Error during ${proofType} transaction submission: ${error}`);
                reject(error);
            }
        });
    });
};
