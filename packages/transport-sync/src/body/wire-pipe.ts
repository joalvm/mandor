import { pipeline, Readable, type Transform } from 'node:stream';
import { finished } from 'node:stream/promises';

/** The raw side of a decoding chain, which wire chunks are pushed into, and the decoded side. */
export type WirePipe = { wire: Readable; outlet: Readable };

/**
 * Chains the transforms of a `content-encoding` behind a source fed one wire chunk at a time.
 * `pipeline`, not `.pipe()`: a failure in any transform destroys the chain with that error, so it
 * reaches the decoded side, where the reader listens, instead of escaping as an uncaught error.
 */
export function wirePipe(transforms: readonly Transform[]): WirePipe {
    const wire = new Readable({
        read() {
            // Chunks are pushed by the reader; the source itself has nothing to pull.
        },
    });
    const outlet = transforms.at(-1);

    if (outlet === undefined) {
        return { wire, outlet: wire };
    }

    // The outlet carries the failure to its own listeners; the callback has nothing left to do.
    pipeline([wire, ...transforms], () => undefined);

    return { wire, outlet };
}

/**
 * Settles once the decoded side ends or fails, and at once if it already did: a broken encoding
 * can fail before the response ends, and an event that has passed is not heard again. Whoever
 * reads the side keeps the failure itself.
 */
export function endOf(outlet: NodeJS.ReadableStream): Promise<void> {
    return finished(outlet).catch(() => undefined);
}
