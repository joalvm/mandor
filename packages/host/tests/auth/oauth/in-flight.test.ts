import { describe, expect, it } from 'vitest';

import { inFlight } from '../../../src/auth/oauth/in-flight.js';
import type { StoredToken } from '../../../src/auth/oauth/stored-token.js';

function token(accessToken: string): StoredToken {
    return { accessToken, expiresAt: 0 };
}

describe('inFlight', () => {
    it('lets a second caller of the same key wait for the flow already running', async () => {
        let runs = 0;
        let finish: (value: StoredToken) => void = () => undefined;

        function make(): Promise<StoredToken> {
            runs += 1;

            return new Promise<StoredToken>((resolve) => {
                finish = resolve;
            });
        }

        const first = inFlight('same', make);
        const second = inFlight('same', make);

        finish(token('token'));

        expect(await first).toEqual(token('token'));
        expect(await second).toEqual(token('token'));
        expect(runs).toBe(1);
    });

    it('does not mix two keys', async () => {
        const [one, two] = await Promise.all([
            inFlight('one', () => Promise.resolve(token('one'))),
            inFlight('two', () => Promise.resolve(token('two'))),
        ]);

        expect([one.accessToken, two.accessToken]).toEqual(['one', 'two']);
    });

    it('forgets the flow when it ends, ok or not, so the next call starts a new one', async () => {
        await expect(inFlight('k', () => Promise.reject(new Error('boom')))).rejects.toThrow(
            'boom',
        );

        expect(await inFlight('k', () => Promise.resolve(token('again')))).toEqual(token('again'));
    });
});
