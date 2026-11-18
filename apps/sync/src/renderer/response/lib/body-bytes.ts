/** A piece of a body as the bridge carries it: text when its bytes are text, base64 when not. */
export type EncodedBody = { data: string; encoding: 'base64' } | { encoding: 'utf8'; text: string };

/** The bytes the bridge was carrying. Text is re-encoded: main only sends it as text if it was. */
export function bytesOfEncoded(part: EncodedBody): Uint8Array {
    if (part.encoding === 'utf8') {
        return new TextEncoder().encode(part.text);
    }

    return Uint8Array.from(atob(part.data), (char) => char.charCodeAt(0));
}

/** A new home for what was read, with room for as much again, up to the whole body. */
function movedBytes(head: Uint8Array, length: number, whole: number): Uint8Array {
    const room = new Uint8Array(Math.max(length, Math.min(whole, length * 2)));

    room.set(head);

    return room.subarray(0, length);
}

/**
 * Two runs of bytes as one: a body read in windows grows by the window that just arrived. It grows
 * in the room left behind what was read, and moves to twice the room when there is none, so a body
 * read whole is copied a few times, not once per window. Only the latest read grows: an earlier
 * one keeps its bytes, which the new ones never overwrite.
 */
export function joinedBytes(head: Uint8Array, tail: Uint8Array, whole: number): Uint8Array {
    const length = head.length + tail.length;
    const joined =
        head.byteOffset + length <= head.buffer.byteLength
            ? new Uint8Array(head.buffer, head.byteOffset, length)
            : movedBytes(head, length, whole);

    joined.set(tail, head.length);

    return joined;
}

/** The text of some bytes, with `U+FFFD` where a window cut a character the next one finishes. */
export function textOfBytes(bytes: Uint8Array): string {
    return new TextDecoder('utf-8').decode(bytes);
}

/** How much of a body is read to say what it is. */
const SAMPLE_BYTES = 4096;

/** A character is at most four bytes, so a cut in the middle of one leaves at most three. */
const CUT_CHARACTER_BYTES = 3;

/**
 * The start of a body as text, or `null` when it is not text: bytes that are not valid utf-8
 * are not, and a character cut by the end of the sample does not count against the rest.
 */
export function textSampleOf(bytes: Uint8Array): string | null {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const sample = bytes.subarray(0, SAMPLE_BYTES);
    const cuts = sample.length < bytes.length ? CUT_CHARACTER_BYTES : 0;

    for (let cut = 0; cut <= cuts; cut += 1) {
        try {
            return decoder.decode(sample.subarray(0, sample.length - cut));
        } catch {
            // Try again one byte shorter: the cut may have been inside a character.
        }
    }

    return null;
}

/** The base64 of some bytes, in pieces so that a body of megabytes does not overflow the stack. */
export function base64OfBytes(bytes: Uint8Array): string {
    const piece = 0x8000;
    let binary = '';

    for (let start = 0; start < bytes.length; start += piece) {
        binary += String.fromCharCode(...bytes.subarray(start, start + piece));
    }

    return btoa(binary);
}
