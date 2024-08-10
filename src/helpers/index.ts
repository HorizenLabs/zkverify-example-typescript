import { ApiPromise, WsProvider } from '@polkadot/api';
import { EventRecord } from '@polkadot/types/interfaces';

/**
 * Creates an ApiPromise instance with a connection timeout.
 * @param provider - The WebSocket provider.
 * @returns A promise that resolves to the ApiPromise instance.
 * @throws An error if the connection times out.
 */
export async function createApi(provider: WsProvider): Promise<ApiPromise> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Failed to connect to the WebSocket URL: ${process.env.WEBSOCKET}`)), 5000)
    );
    return await Promise.race([ApiPromise.create({ provider }), timeout]);
}

/**
 * Handles events emitted by the zkVerify blockchain.
 * @param events - The array of event records.
 * @param callback - The callback function to execute when the event matches criteria.
 */
export function handleEvents(events: EventRecord[], callback: (data: any[]) => void): void {
    events.forEach(({ event: { data, method, section } }) => {
        if (section === 'poe' && method === 'NewElement') {
            callback(data);
        }
    });
}

/**
 * Waits for a specific NewAttestation event.
 * @param api - The ApiPromise instance.
 * @param timeoutDuration - The duration in milliseconds before timing out.
 * @param attestationId - The attestation ID to wait for.
 * @param startTime - The start time of the operation.
 * @returns A promise that resolves to the attestation data.
 * @throws An error if the attestation ID is null or the wait times out.
 */
export async function waitForNewAttestation(api: ApiPromise, timeoutDuration: number, attestationId: string | null, startTime: number): Promise<[number, string]> {
    return new Promise(async (resolve, reject) => {
        if (!attestationId) {
            return reject(new Error("Attestation ID is null, cannot wait for event."));
        }

        const timeout = setTimeout(() => {
            console.error("Timeout expired while waiting for NewAttestation event.");
            reject(new Error("Timeout expired"));
        }, timeoutDuration);

        const interval = setInterval(() => {
            console.log(`Waiting for NewAttestation event... (elapsed time: ${(Date.now() - startTime) / 1000} seconds)`);
        }, 15000);

        try {
            const unsubscribe = await api.query.system.events((events: EventRecord[]) => {
                events.forEach((record) => {
                    const { event } = record;
                    const types = event.typeDef;

                    if (event.section === "poe" && event.method === "NewAttestation") {
                        const currentAttestationId = event.data[0].toString();
                        if (currentAttestationId === attestationId) {
                            clearTimeout(timeout);
                            clearInterval(interval);
                            unsubscribe();
                            console.log(`Matched NewAttestation event with attestation ID: ${attestationId}`);
                            event.data.forEach((data, index) => {
                                console.log(`\t${types[index].type}: ${data.toString()}`);
                            });
                            resolve([parseInt(event.data[0].toString()), event.data[1].toString()]);
                        }
                    }
                });
            }) as unknown as () => void;
        } catch (error) {
            console.error("Error subscribing to system events:", error);
            clearTimeout(timeout);
            clearInterval(interval);
            reject(error);
        }
    });
}

/**
 * Waits for the zkVerify node to sync.
 * @param api - The ApiPromise instance.
 * @returns A promise that resolves when the node is synced.
 */
export async function waitForNodeToSync(api: ApiPromise): Promise<void> {
    let isSyncing = true;
    while (isSyncing) {
        const health = await api.rpc.system.health();
        isSyncing = health.isSyncing.isTrue;
        if (isSyncing) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
