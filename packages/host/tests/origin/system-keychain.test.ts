import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { NoticeOutbox } from '../../src/notice/raise-notice.js';
import { hasSystemKeychain, noticeMissingKeychain } from '../../src/origin/system-keychain.js';

const keychain = vi.hoisted(() => ({ available: true, backend: 'gnome_libsecret' }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
        backend: () => keychain.backend,
    }),
}));

beforeEach(() => {
    keychain.available = true;
    keychain.backend = 'gnome_libsecret';
});

function outbox(): NoticeOutbox & { raised: unknown[][] } {
    const raised: unknown[][] = [];

    return {
        raised,
        raise: (...notice) => {
            raised.push(notice);
        },
        list: () => [],
    };
}

describe('the keychain of the system', () => {
    it('is there when the system encrypts with a key of its own', async () => {
        await expect(hasSystemKeychain('linux')).resolves.toBe(true);
    });

    it('is not there when the system cannot encrypt at all', async () => {
        keychain.available = false;

        await expect(hasSystemKeychain('linux')).resolves.toBe(false);
    });

    /** `basic_text` encrypts with a key every copy of Chromium carries: as good as clear. */
    it('is not there when Linux falls back to the key written into Chromium', async () => {
        keychain.backend = 'basic_text';

        await expect(hasSystemKeychain('linux')).resolves.toBe(false);
    });

    /** The backend is a question only Linux answers; Windows and macOS always keep the key. */
    it('asks no backend off Linux', async () => {
        keychain.backend = 'basic_text';

        await expect(hasSystemKeychain('win32')).resolves.toBe(true);
        await expect(hasSystemKeychain('darwin')).resolves.toBe(true);
    });
});

describe('the notice of a missing keychain', () => {
    it('tells the window once, folded under one key', async () => {
        const notices = outbox();

        keychain.available = false;
        await noticeMissingKeychain(notices);

        expect(notices.raised).toEqual([
            ['keychain-missing', 'warning', undefined, 'keychain-missing'],
        ]);
    });

    it('says nothing when the system keeps the key', async () => {
        const notices = outbox();

        await noticeMissingKeychain(notices);

        expect(notices.raised).toEqual([]);
    });
});
