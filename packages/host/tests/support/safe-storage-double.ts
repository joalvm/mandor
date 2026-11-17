/**
 * What the test says about the machine: whether it can encrypt at all, and which backend Linux
 * picked. Read on every call, so a test can change its mind between two of them.
 */
export type KeychainOfTest = {
    available: () => boolean;
    backend?: () => string;
};

/** Ciphertext of today's key, and of a key the system has since rotated away from. */
const CURRENT = 'enc:';
const ROTATED = 'old:';

/**
 * The keychain of the system does not exist in a test run. The double keeps the contract of the
 * asynchronous `safeStorage`: a string in, bytes that are not the string out, and back; a machine
 * that can say no; and a ciphertext of a rotated key that asks to be encrypted again.
 */
export function safeStorageDouble(keychain: KeychainOfTest = { available: () => true }): object {
    return {
        isAsyncEncryptionAvailable: () => Promise.resolve(keychain.available()),
        getSelectedStorageBackend: () => keychain.backend?.() ?? 'gnome_libsecret',
        encryptStringAsync: (value: string) => Promise.resolve(Buffer.from(`${CURRENT}${value}`)),
        decryptStringAsync: (bytes: Buffer) => Promise.resolve(decrypted(bytes.toString('utf8'))),
    };
}

/** Bytes as a key the system rotated away from left them: they read, and ask to be redone. */
export function rotatedCiphertext(value: string): Buffer {
    return Buffer.from(`${ROTATED}${value}`);
}

function decrypted(text: string): { result: string; shouldReEncrypt: boolean } {
    if (text.startsWith(ROTATED)) {
        return { result: text.slice(ROTATED.length), shouldReEncrypt: true };
    }

    if (!text.startsWith(CURRENT)) {
        throw new Error('Error while decrypting the ciphertext provided to safeStorage');
    }

    return { result: text.slice(CURRENT.length), shouldReEncrypt: false };
}
