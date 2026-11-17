import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    clearSecret,
    heldSecretKeys,
    readSecret,
    storeSecret,
} from '../../src/origin/secret-store.js';
import { rotatedCiphertext } from '../support/safe-storage-double.js';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

let userData: string;

beforeEach(async () => {
    keychain.available = true;
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

async function stored(): Promise<Record<string, string>> {
    const source = await readFile(join(userData, 'secrets.json'), 'utf8');

    return JSON.parse(source) as Record<string, string>;
}

describe('the store of secrets', () => {
    it('keeps the secret under its key, encrypted and in base64', async () => {
        await expect(storeSecret(userData, 'team', 'tok_secret')).resolves.toBe('disk');

        await expect(stored()).resolves.toEqual({
            team: Buffer.from('enc:tok_secret', 'utf8').toString('base64'),
        });
    });

    /** What the file holds is not what the origin carried: the clear token never touches disk. */
    it('never writes the secret in clear', async () => {
        await storeSecret(userData, 'team', 'tok_secret');

        await expect(readFile(join(userData, 'secrets.json'), 'utf8')).resolves.not.toContain(
            'tok_secret',
        );
    });

    it('keeps the secrets of the other origins when one is added', async () => {
        await storeSecret(userData, 'one', 'first');
        await storeSecret(userData, 'two', 'second');

        const secrets = await stored();

        expect(Object.keys(secrets).sort()).toEqual(['one', 'two']);
    });

    /** The file is read and written whole: calls that overlap must neither drop nor revive one. */
    it('keeps and takes out every secret of calls that overlap', async () => {
        const keys = Array.from({ length: 10 }, (_value, index) => `key-${String(index)}`);

        await Promise.all(keys.map((key) => storeSecret(userData, key, 'value')));

        expect(Object.keys(await stored()).sort()).toEqual([...keys].sort());

        await Promise.all(keys.slice(0, 5).map((key) => clearSecret(userData, key)));

        expect(Object.keys(await stored()).sort()).toEqual(keys.slice(5).sort());
    });

    it('gives the value back under the key it was kept', async () => {
        await storeSecret(userData, 'team', 'tok_secret');

        await expect(readSecret(userData, 'team')).resolves.toBe('tok_secret');
    });

    /** A key the system rotated still opens what it closed, and asks for it to be closed anew. */
    it('encrypts again what a rotated key had encrypted, once it reads it', async () => {
        await storeSecret(userData, 'other', 'kept');
        await writeFile(
            join(userData, 'secrets.json'),
            JSON.stringify({
                ...(await stored()),
                team: rotatedCiphertext('tok_secret').toString('base64'),
            }),
            'utf8',
        );

        await expect(readSecret(userData, 'team')).resolves.toBe('tok_secret');
        await expect(stored()).resolves.toEqual({
            other: Buffer.from('enc:kept', 'utf8').toString('base64'),
            team: Buffer.from('enc:tok_secret', 'utf8').toString('base64'),
        });
    });

    /** A declared variable with nothing kept for it here is not an error, it is empty. */
    it('answers with nothing for a key that has no value on this machine', async () => {
        await expect(readSecret(userData, 'team')).resolves.toBeNull();
    });

    it('takes one secret out and leaves the rest where they were', async () => {
        await storeSecret(userData, 'one', 'first');
        await storeSecret(userData, 'two', 'second');

        await clearSecret(userData, 'one');

        await expect(readSecret(userData, 'one')).resolves.toBeNull();
        await expect(readSecret(userData, 'two')).resolves.toBe('second');
    });

    /** Taking out comes second, so it has to win: the secret must not land after it was cleared. */
    it('takes out a secret that was still being kept when it was asked to', async () => {
        await Promise.all([storeSecret(userData, 'team', 'tok'), clearSecret(userData, 'team')]);

        await expect(readSecret(userData, 'team')).resolves.toBeNull();
    });

    /** Clearing what is not there is what the caller wanted anyway: nothing kept for that key. */
    it('takes out a key that was never kept without complaining', async () => {
        await expect(clearSecret(userData, 'nobody')).resolves.toBeUndefined();
    });

    /** Read as empty, the next secret kept would rewrite the file with that one alone. */
    it('fails on a file that is there but cannot be read', async () => {
        await mkdir(join(userData, 'secrets.json'));

        await expect(readSecret(userData, 'team')).rejects.toThrow();
    });

    it('reads a file that holds something other than encrypted values as no secrets', async () => {
        await writeFile(join(userData, 'secrets.json'), '{"team": 7}', 'utf8');

        await expect(readSecret(userData, 'team')).resolves.toBeNull();
    });

    describe('on a machine with no keychain', () => {
        /** Linux without a keyring. Clear text on disk is the one thing that must not happen. */
        it('keeps the secret in memory and writes nothing', async () => {
            keychain.available = false;

            await expect(storeSecret(userData, 'team', 'tok_secret')).resolves.toBe('memory');
            await expect(readSecret(userData, 'team')).resolves.toBe('tok_secret');
            await expect(readFile(join(userData, 'secrets.json'), 'utf8')).rejects.toThrow();
        });

        it('names what it holds for this user data and no other', async () => {
            keychain.available = false;
            await storeSecret(userData, 'one', 'first');
            await storeSecret(`${userData}-other`, 'two', 'second');

            expect(heldSecretKeys(userData)).toEqual(['one']);
        });

        it('answers with nothing for a secret it never held', async () => {
            keychain.available = false;

            await expect(readSecret(userData, 'team')).resolves.toBeNull();
        });

        /** A keyring installed while the app runs takes the next value to disk, and out of memory. */
        it('moves a secret from memory to disk once the keychain is there', async () => {
            keychain.available = false;
            await storeSecret(userData, 'team', 'first');

            keychain.available = true;
            await storeSecret(userData, 'team', 'second');

            expect(heldSecretKeys(userData)).toEqual([]);
            await expect(readSecret(userData, 'team')).resolves.toBe('second');
        });

        it('takes a secret held in memory out', async () => {
            keychain.available = false;
            await storeSecret(userData, 'team', 'tok_secret');

            await clearSecret(userData, 'team');

            await expect(readSecret(userData, 'team')).resolves.toBeNull();
        });

        /** Taking a value out needs no keychain, and a machine that lost one still can. */
        it('still takes a kept secret out', async () => {
            await storeSecret(userData, 'team', 'tok_secret');
            keychain.available = false;

            await expect(clearSecret(userData, 'team')).resolves.toBeUndefined();
            await expect(stored()).resolves.toEqual({});
        });
    });
});
