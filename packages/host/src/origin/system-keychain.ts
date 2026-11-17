import { safeStorage } from 'electron';

import type { NoticeOutbox } from '../notice/raise-notice.js';

/** The notice and the fold of its repeats: one per window, however many times it is raised. */
const NOTICE = 'keychain-missing';

/**
 * Whether the system keeps what Mandor encrypts under a key of its own. On Linux with no keyring
 * Electron still says encryption is available, but its `basic_text` backend encrypts with a key
 * written into Chromium, the same on every machine: a file kept that way is as good as clear.
 */
export async function hasSystemKeychain(
    platform: NodeJS.Platform = process.platform,
): Promise<boolean> {
    return (await safeStorage.isAsyncEncryptionAvailable()) && !encryptsWithKnownKey(platform);
}

/**
 * Tells the window that passwords and tokens last only until Mandor closes, when the system has
 * no keychain to keep them in. Nothing is refused: the person keeps working, and learns why the
 * next run asks again.
 */
export async function noticeMissingKeychain(outbox: NoticeOutbox): Promise<void> {
    if (await hasSystemKeychain()) {
        return;
    }

    outbox.raise(NOTICE, 'warning', undefined, NOTICE);
}

/** The backend can only be asked on Linux; on Windows and macOS the system always keeps the key. */
function encryptsWithKnownKey(platform: NodeJS.Platform): boolean {
    return platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text';
}
