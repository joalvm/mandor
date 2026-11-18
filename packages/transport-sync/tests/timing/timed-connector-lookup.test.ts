import dns from 'node:dns';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { timedConnector } from '../../src/timing/timed-connector.js';
import type { ConnectionPhases } from '../../src/timing/connection-phases.js';

function phases(): ConnectionPhases {
    return {
        dnsMs: 0,
        connectMs: 0,
        tlsMs: 0,
        firstByteAt: 0,
        lastPhaseEndAt: 0,
        alpnProtocol: null,
        network: null,
    };
}

function lookupOf(
    delayMs: number,
    answer: () => dns.LookupAddress[] | NodeJS.ErrnoException,
): void {
    vi.spyOn(dns, 'lookup').mockImplementation((...args: unknown[]) => {
        const callback = args[2] as (
            error: NodeJS.ErrnoException | null,
            addresses: dns.LookupAddress[],
        ) => void;

        setTimeout(() => {
            const outcome = answer();

            if (outcome instanceof Error) {
                callback(outcome, []);

                return;
            }

            callback(null, outcome);
        }, delayMs);

        return {} as never;
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('timedConnector against a slow or failing lookup', () => {
    it('ignores a name that resolves after the connect timeout already fired', async () => {
        lookupOf(40, () => [{ address: '127.0.0.1', family: 4 }]);

        const connector = timedConnector({ verify: false }, 10, phases());
        const error = await new Promise<Error>((resolve, reject) => {
            connector({ hostname: 'slow.test', port: 443, protocol: 'https:' }, (...args) => {
                const caught = args[0];

                if (caught !== null) {
                    resolve(caught);

                    return;
                }

                reject(new Error('the timeout did not fire'));
            });
        });

        expect((error as NodeJS.ErrnoException).code).toBe('UND_ERR_CONNECT_TIMEOUT');
    });

    it('fails the connection when the name does not resolve at all', async () => {
        lookupOf(0, () => Object.assign(new Error('name is unknown'), { code: 'ENOTFOUND' }));

        const connector = timedConnector({ verify: false }, 1_000, phases());
        const error = await new Promise<Error>((resolve, reject) => {
            connector({ hostname: 'unknown.test', port: 443, protocol: 'https:' }, (...args) => {
                const caught = args[0];

                if (caught !== null) {
                    resolve(caught);

                    return;
                }

                reject(new Error('the lookup did not fail'));
            });
        });

        expect((error as NodeJS.ErrnoException).code).toBe('ENOTFOUND');
    });
});
