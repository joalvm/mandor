import { describe, expect, it } from 'vitest';

import { responsesInFlight } from '../../../../src/main/request/responses-in-flight.js';

const HERE = { origin: 'demo', workspaceId: 'payments', environmentId: 'local' };
const ELSEWHERE = { ...HERE, environmentId: null };

/** A run the test ends when it says so. */
function run() {
    const { promise, resolve, reject } = Promise.withResolvers<undefined>();

    return {
        promise,
        end: () => {
            resolve(undefined);
        },
        fail: () => {
            reject(new Error('the script failed'));
        },
    };
}

function never(): AbortSignal {
    return new AbortController().signal;
}

describe('the onResponse chains in flight', () => {
    it('waits for the chains of its place, and only those, until they end', async () => {
        const inFlight = responsesInFlight();
        const here = run();
        const elsewhere = run();
        const seen: string[] = [];

        inFlight.track(HERE, here.promise);
        inFlight.track(ELSEWHERE, elsewhere.promise);

        const waited = inFlight.settled(HERE, 60_000, never()).then(() => seen.push('settled'));

        seen.push('before');
        here.end();
        await waited;

        expect(seen).toEqual(['before', 'settled']);
    });

    it('waits for nothing when no chain of its place runs', async () => {
        const inFlight = responsesInFlight();

        inFlight.track(ELSEWHERE, run().promise);

        await expect(inFlight.settled(HERE, 60_000, never())).resolves.toBeUndefined();
    });

    it('counts a chain that failed as ended, and forgets each one by itself', async () => {
        const inFlight = responsesInFlight();
        const failed = run();
        const still = run();
        const seen: string[] = [];

        inFlight.track(HERE, failed.promise);
        inFlight.track(HERE, still.promise);
        failed.fail();
        await failed.promise.catch(() => undefined);

        const waited = inFlight.settled(HERE, 60_000, never()).then(() => seen.push('settled'));

        await Promise.resolve();
        seen.push('still running');
        still.end();
        await waited;

        expect(seen).toEqual(['still running', 'settled']);
    });

    it('stops waiting once the time is over, with the chain still running', async () => {
        const inFlight = responsesInFlight();

        inFlight.track(HERE, run().promise);

        await expect(inFlight.settled(HERE, 1, never())).resolves.toBeUndefined();
    });

    it('stops waiting when the send is cancelled', async () => {
        const inFlight = responsesInFlight();
        const controller = new AbortController();

        inFlight.track(HERE, run().promise);

        const waited = inFlight.settled(HERE, 60_000, controller.signal);

        controller.abort();

        await expect(waited).resolves.toBeUndefined();
    });
});
