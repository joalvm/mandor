import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

import { forgetToken, readToken, writeToken } from '../../../src/auth/oauth/token-cache.js';
import { rotatedCiphertext } from '../../support/safe-storage-double.js';

const KEY = 'a'.repeat(64);
const TOKEN = {
    accessToken: 'the-access-token',
    refreshToken: 'the-refresh',
    expiresAt: 1_000_000,
};

let root: string;

beforeEach(async () => {
    keychain.available = true;
    root = await mkdtemp(join(tmpdir(), 'mandor-tokens-'));
});

afterEach(async () => {
    await forgetToken(root, KEY);
    await rm(root, { recursive: true, force: true });
});

async function filesOfTokens(): Promise<string[]> {
    return readdir(join(root, '.mandor', 'tokens')).catch(() => []);
}

describe('the token cache', () => {
    it('keeps nothing for a key nobody wrote', async () => {
        expect(await readToken(root, KEY)).toBeNull();
    });

    it('gives back what it was given, from disk, and says so', async () => {
        expect(await writeToken(root, KEY, TOKEN)).toBe('disk');
        expect(await readToken(root, KEY)).toEqual({ token: TOKEN, storage: 'disk' });
    });

    it('writes the expiration in view and the token only as ciphertext', async () => {
        await writeToken(root, KEY, TOKEN);

        const raw = await readFile(join(root, '.mandor', 'tokens', `${KEY}.json`), 'utf8');
        const file = JSON.parse(raw) as { expiresAt: number; ciphertext: string };

        expect(file.expiresAt).toBe(1_000_000);
        expect(raw).not.toContain('the-access-token');
        expect(raw).not.toContain('the-refresh');
        expect(file.ciphertext).not.toBe('');
    });

    it('keeps a token without a refresh token as one', async () => {
        await writeToken(root, KEY, { accessToken: 'only', expiresAt: 5 });

        expect((await readToken(root, KEY))?.token).toEqual({ accessToken: 'only', expiresAt: 5 });
    });

    it('writes no file when the machine has no keychain, and holds the token in memory', async () => {
        keychain.available = false;

        expect(await writeToken(root, KEY, TOKEN)).toBe('memory');
        expect(await filesOfTokens()).toEqual([]);
        expect(await readToken(root, KEY)).toEqual({ token: TOKEN, storage: 'memory' });
    });

    it('does not read what a keychain-less machine cannot decrypt', async () => {
        await writeToken(root, KEY, TOKEN);

        keychain.available = false;

        expect(await readToken(root, KEY)).toBeNull();
    });

    /** A key the system rotated still opens the file, and the file is closed anew under today's. */
    it('encrypts again a token that a rotated key had encrypted, once it reads it', async () => {
        const path = join(root, '.mandor', 'tokens', `${KEY}.json`);
        const secret = JSON.stringify({
            accessToken: TOKEN.accessToken,
            refreshToken: TOKEN.refreshToken,
        });

        await writeToken(root, KEY, TOKEN);
        await writeFile(
            path,
            JSON.stringify({
                expiresAt: TOKEN.expiresAt,
                ciphertext: rotatedCiphertext(secret).toString('base64'),
            }),
            'utf8',
        );

        expect(await readToken(root, KEY)).toEqual({ token: TOKEN, storage: 'disk' });
        expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
            expiresAt: TOKEN.expiresAt,
            ciphertext: Buffer.from(`enc:${secret}`).toString('base64'),
        });
    });

    it('treats a file that does not parse as no token at all', async () => {
        await writeToken(root, KEY, TOKEN);
        await writeFile(join(root, '.mandor', 'tokens', `${KEY}.json`), 'not json', 'utf8');

        expect(await readToken(root, KEY)).toBeNull();
    });

    it('refuses a key that is not the hex of a sha256: it would be a path', async () => {
        await expect(readToken(root, '../escape')).resolves.toBeNull();
        await expect(writeToken(root, '../escape', TOKEN)).rejects.toThrow();
        await expect(forgetToken(root, '../escape')).rejects.toThrow();
    });

    it('forgets from disk and from memory, and a missing token is nothing to forget', async () => {
        await writeToken(root, KEY, TOKEN);
        await forgetToken(root, KEY);

        expect(await readToken(root, KEY)).toBeNull();
        expect(await filesOfTokens()).toEqual([]);

        keychain.available = false;
        await writeToken(root, KEY, TOKEN);
        await forgetToken(root, KEY);

        expect(await readToken(root, KEY)).toBeNull();
        await expect(forgetToken(root, KEY)).resolves.toBeUndefined();
    });

    /**
     * A send can be filing the token it just got when the person asks to forget it. Forgetting
     * comes second, so it has to win: the file must not land after it was taken out.
     */
    it('forgets a token that was still being filed when it was asked to', async () => {
        await Promise.all([writeToken(root, KEY, TOKEN), forgetToken(root, KEY)]);

        expect(await readToken(root, KEY)).toBeNull();
        expect(await filesOfTokens()).toEqual([]);
    });

    it('moves a token from memory to disk once the keychain is there', async () => {
        keychain.available = false;
        await writeToken(root, KEY, TOKEN);

        keychain.available = true;
        await writeToken(root, KEY, { ...TOKEN, accessToken: 'newer' });

        expect(await readToken(root, KEY)).toMatchObject({
            token: { accessToken: 'newer' },
            storage: 'disk',
        });
    });
});
