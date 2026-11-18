import type { BodySpill } from '../../src/response/body-spill.js';
import type { SpillPort } from '../../src/request/sync-request.js';

export type MemorySpill = BodySpill & {
    written: () => Buffer;
    finished: () => boolean;
    aborted: () => boolean;
};

/** A spill that keeps everything in memory: the real one is the app's business. */
export function memorySpill(): MemorySpill {
    const chunks: Buffer[] = [];
    let finished = false;
    let aborted = false;

    return {
        write: (chunk) => {
            chunks.push(Buffer.from(chunk));

            return Promise.resolve();
        },
        finish: () => {
            finished = true;

            return Promise.resolve('spill-ref');
        },
        abort: () => {
            aborted = true;

            return Promise.resolve();
        },
        written: () => Buffer.concat(chunks),
        finished: () => finished,
        aborted: () => aborted,
    };
}

/** A port to a memory spill whose every write waits until the test says the disk caught up. */
export function stalledPort(thresholdBytes: number): { port: SpillPort; release: () => void } {
    const spill = memorySpill();
    let release: () => void = () => undefined;
    const writable = new Promise<void>((resolve) => {
        release = resolve;
    });
    const port: SpillPort = {
        thresholdBytes,
        open: () =>
            Promise.resolve({
                ...spill,
                write: async (chunk) => {
                    await writable;
                    await spill.write(chunk);
                },
            }),
    };

    // The executor of the promise runs at once: `release` already resolves it here.
    return { port, release };
}
