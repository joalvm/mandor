import { join } from 'node:path';

import { safeStorage } from 'electron';
import { z } from 'zod';

import { atomicWrite, inTurn, readTextOrNull } from '@mandor/store-fs';

import { hasSystemKeychain } from './system-keychain.js';

/** One file of ciphertexts, keyed by whatever each secret belongs to. */
const FILE = 'secrets.json';

/** Each key names one ciphertext, in base64. */
const secretsSchema = z.record(z.string(), z.string());

/** Where a secret went: ciphered on disk, or only into this process for a system without keychain. */
export type SecretStorage = 'disk' | 'memory';

/**
 * Module state, like the tokens held without a keychain: what this process keeps for a system
 * that has nowhere safe to put it, until the app closes.
 */
const memory = new Map<string, string>();

/**
 * The secrets of the app, encrypted by the keychain of the system and kept in userData.
 * Never inside a repo, never in clear in any file: what is written here is base64 of what
 * `safeStorage` already encrypted, so the file is useless off this machine and off this user.
 * A system without a keychain gets nothing on disk: the value waits in memory instead.
 *
 * The key is opaque here. Who builds it knows what it names; this module only files it away.
 */
export async function storeSecret(
    userDataDir: string,
    key: string,
    value: string,
): Promise<SecretStorage> {
    const held = memoryKey(userDataDir, key);

    // The file is read and written whole: each change waits for the one before it to land, and
    // asking the keychain is part of the change, so a clear that comes second always wins.
    return inTurn(join(userDataDir, FILE), async () => {
        if (!(await hasSystemKeychain())) {
            memory.set(held, value);

            return 'memory';
        }

        memory.delete(held);

        const secrets = await readSecrets(userDataDir);

        secrets[key] = (await safeStorage.encryptStringAsync(value)).toString('base64');
        await write(userDataDir, secrets);

        return 'disk';
    });
}

/** The keys this process holds for a system without keychain: kept, but only until it closes. */
export function heldSecretKeys(userDataDir: string): string[] {
    const prefix = memoryKey(userDataDir, '');

    return [...memory.keys()]
        .filter((held) => held.startsWith(prefix))
        .map((held) => held.slice(prefix.length));
}

/** The value kept under a key, or nothing when this machine keeps none for it. */
export async function readSecret(userDataDir: string, key: string): Promise<string | null> {
    const held = memory.get(memoryKey(userDataDir, key));

    if (held !== undefined) {
        return held;
    }

    if (!(await hasSystemKeychain())) {
        return null;
    }

    const secrets = await readSecrets(userDataDir);
    const stored = secrets[key];

    if (stored === undefined) {
        return null;
    }

    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(
        Buffer.from(stored, 'base64'),
    );

    if (shouldReEncrypt) {
        await storeSecret(userDataDir, key, result);
    }

    return result;
}

/**
 * Takes a value out for good. It asks the keychain for nothing: a machine that lost its
 * keyring can still stop keeping a secret, and refusing that would leave it stuck forever.
 */
export async function clearSecret(userDataDir: string, key: string): Promise<void> {
    await inTurn(join(userDataDir, FILE), async () => {
        memory.delete(memoryKey(userDataDir, key));

        const secrets = await readSecrets(userDataDir);

        if (!(key in secrets)) {
            return;
        }

        const kept = Object.entries(secrets).filter(([name]) => name !== key);

        await write(userDataDir, Object.fromEntries(kept));
    });
}

function memoryKey(userDataDir: string, key: string): string {
    return `${userDataDir}\u0000${key}`;
}

async function write(userDataDir: string, secrets: Record<string, string>): Promise<void> {
    await atomicWrite(join(userDataDir, FILE), JSON.stringify(secrets, null, 4));
}

/**
 * A secrets file that does not parse is worth nothing, the same as a missing one. One that is
 * there and cannot be read fails: read as empty, the next secret kept would be the only one.
 */
async function readSecrets(userDataDir: string): Promise<Record<string, string>> {
    const source = (await readTextOrNull(join(userDataDir, FILE))) ?? '';

    try {
        const parsed = secretsSchema.safeParse(JSON.parse(source));

        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
}
