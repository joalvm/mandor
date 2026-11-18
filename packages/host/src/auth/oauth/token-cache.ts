import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { safeStorage } from 'electron';
import { z } from 'zod';

import { mandorDir, atomicWrite, inTurn } from '@mandor/store-fs';

import { hasSystemKeychain } from '../../origin/system-keychain.js';

import type { StoredToken } from './stored-token.js';

/** What a key looks like: the hex of a sha256, which is also what keeps it from being a path. */
const KEY = /^[0-9a-f]{64}$/;

const fileSchema = z.object({ expiresAt: z.number(), ciphertext: z.string() });

const secretSchema = z.object({ accessToken: z.string(), refreshToken: z.string().optional() });

/** Where a token lives: ciphered on disk, or only in this process for a machine without keychain. */
export type TokenStorage = 'disk' | 'memory';

export type CachedToken = { token: StoredToken; storage: TokenStorage };

/** Module state, like the active origin: one process, one set of tokens held without a keychain. */
const memory = new Map<string, StoredToken>();

/**
 * The token filed under a key, expired or not — the renewal needs its refresh token. A file the
 * keychain of this machine cannot open, or that does not parse, is worth nothing.
 */
export async function readToken(root: string, key: string): Promise<CachedToken | null> {
    const held = memory.get(memoryKey(root, key));

    if (held !== undefined) {
        return { token: held, storage: 'memory' };
    }

    if (!(await hasSystemKeychain())) {
        return null;
    }

    const opened = await openToken(root, key);

    if (opened === null) {
        return null;
    }

    // A key the system rotated still opens the file; what it opened is closed again under the
    // key of today, so the file stops depending on the old one.
    if (opened.shouldReEncrypt) {
        await writeToken(root, key, opened.token);
    }

    return { token: opened.token, storage: 'disk' };
}

/**
 * Files a token. The expiration stays in view; the token is only ciphertext. Without a keychain
 * nothing reaches the disk: the token waits in memory until the app closes.
 */
export async function writeToken(
    root: string,
    key: string,
    token: StoredToken,
): Promise<TokenStorage> {
    const held = memoryKey(root, key);
    const file = fileOf(root, key);

    // Filing and forgetting one key wait their turn, keychain question included: a forget that
    // comes second must not find the token still missing and let it land after.
    return inTurn(file, async () => {
        if (!(await hasSystemKeychain())) {
            memory.set(held, token);

            return 'memory';
        }

        const secret = { accessToken: token.accessToken, refreshToken: token.refreshToken };
        const ciphertext = await safeStorage.encryptStringAsync(JSON.stringify(secret));

        memory.delete(held);
        await mkdir(dirname(file), { recursive: true });
        await atomicWrite(
            file,
            JSON.stringify(
                { expiresAt: token.expiresAt, ciphertext: ciphertext.toString('base64') },
                null,
                4,
            ),
        );

        return 'disk';
    });
}

/** Takes a token out for good. It asks the keychain for nothing: forgetting always works. */
export async function forgetToken(root: string, key: string): Promise<void> {
    const file = fileOf(root, key);

    await inTurn(file, async () => {
        memory.delete(memoryKey(root, key));
        await rm(file, { force: true });
    });
}

function memoryKey(root: string, key: string): string {
    return `${root}\u0000${key}`;
}

function fileOf(root: string, key: string): string {
    if (!KEY.test(key)) {
        throw new Error('a token key is the hex of a sha256');
    }

    return join(mandorDir(root), 'tokens', `${key}.json`);
}

/** The token a file holds, or nothing when the keychain cannot open it or it does not parse. */
async function openToken(
    root: string,
    key: string,
): Promise<{ token: StoredToken; shouldReEncrypt: boolean } | null> {
    try {
        const file = fileSchema.parse(JSON.parse(await readFile(fileOf(root, key), 'utf8')));
        const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(
            Buffer.from(file.ciphertext, 'base64'),
        );
        const secret = secretSchema.parse(JSON.parse(result));

        return {
            token: {
                accessToken: secret.accessToken,
                ...(secret.refreshToken === undefined ? {} : { refreshToken: secret.refreshToken }),
                expiresAt: file.expiresAt,
            },
            shouldReEncrypt,
        };
    } catch {
        return null;
    }
}
