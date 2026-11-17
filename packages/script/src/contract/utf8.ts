const encoder = new TextEncoder();
const strict = new TextDecoder('utf-8', { fatal: true });

/** The size of a text in UTF-8 bytes, which is what every limit of a script counts. */
export function byteLength(text: string): number {
    return encoder.encode(text).length;
}

/** The text cut to a number of bytes, never inside a character. */
export function truncateUtf8(text: string, maxBytes: number): string {
    const bytes = encoder.encode(text);

    if (bytes.length <= maxBytes) {
        return text;
    }

    // A negative end would count from the back of the bytes and keep more than the limit.
    return decodeUpTo(bytes, Math.max(0, maxBytes));
}

/** The longest start of the bytes, up to the cut, that still decodes: a half character falls off. */
function decodeUpTo(bytes: Uint8Array, cut: number): string {
    try {
        return strict.decode(bytes.subarray(0, cut));
    } catch {
        return decodeUpTo(bytes, cut - 1);
    }
}
