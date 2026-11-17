/** Crockford's alphabet in lower case: no i, l, o or u to misread. 32 symbols: a byte maps without bias. */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const LENGTH = 12;

export type RandomFill = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array;

/**
 * A new id: random, opaque and stable. It names a file or a folder of the repo and never
 * changes with the visible name, which lives inside the file.
 */
export function newId(fill: RandomFill = (bytes) => crypto.getRandomValues(bytes)): string {
    return Array.from(fill(new Uint8Array(LENGTH)), (byte) =>
        ALPHABET.charAt(byte % ALPHABET.length),
    ).join('');
}
