import type { Transform } from 'node:stream';
import {
    createBrotliDecompress,
    createGunzip,
    createInflate,
    createZstdDecompress,
} from 'node:zlib';

/** A map, not an object: the names come from the server, and `constructor` is no encoding. */
const DECODER_OF = new Map<string, () => Transform>([
    ['gzip', createGunzip],
    ['x-gzip', createGunzip],
    ['deflate', createInflate],
    ['br', createBrotliDecompress],
    ['zstd', createZstdDecompress],
]);

/**
 * The most codings undone for one response, the bound curl and undici keep. A header of a few
 * kilobytes names thousands, and each is a decoder that holds memory and the thread pool of main
 * for as long as the server feeds it.
 */
const MAX_ENCODINGS = 5;

/**
 * The transforms that undo a `content-encoding`, in the order they run. The header lists codings
 * in the order they were applied (RFC 9110, 8.4): `gzip, br` is `br(gzip(body))` on the wire, so
 * the last name is undone first. One encoding the transport does not know refuses the whole
 * header: half-decoded bytes would look like a body. So does a header past the bound.
 */
export function decoderOf(encodings: readonly string[]): Transform[] | null {
    if (encodings.length === 0 || encodings.length > MAX_ENCODINGS) {
        return null;
    }

    const transforms: Transform[] = [];

    for (const encoding of encodings) {
        const create = DECODER_OF.get(encoding.trim().toLowerCase());

        if (create === undefined) {
            return null;
        }

        transforms.unshift(create());
    }

    return transforms;
}
