import { describe, expect, it } from 'vitest';

import { BodyReader } from '../../src/body/read-body.js';
import type { SpillPort } from '../../src/request/sync-request.js';
import { memorySpill, stalledPort } from '../support/memory-spill.js';

describe('BodyReader with a spill that takes time to open', () => {
    /**
     * The disk takes a moment to open a file, and the wire does not wait: chunks that arrive
     * while it opens belong to the same file, and the spill is opened once, not once per chunk.
     */
    it('opens the spill once when chunks keep arriving while it opens', async () => {
        const spill = memorySpill();
        let opened = 0;
        let release: () => void = () => undefined;
        // The file opens when the test says so: every chunk arrives while it is still opening.
        const opening = new Promise<void>((resolve) => {
            release = resolve;
        });
        const slow: SpillPort = {
            thresholdBytes: 10,
            open: async () => {
                opened += 1;
                await opening;

                return spill;
            },
        };
        const reader = BodyReader.start([], slow);
        const chunks = Array.from({ length: 6 }, (_, index) => Buffer.alloc(6, 0x61 + index));

        for (const chunk of chunks) {
            reader.onWireChunk(chunk);
        }

        release();

        const outcome = await reader.finish();

        expect(opened).toBe(1);
        expect(spill.written().equals(Buffer.concat(chunks))).toBe(true);
        expect(outcome.body).toMatchObject({ kind: 'spilled', bytes: 36 });
    });

    /** A disk slower than the wire: what waits for it would otherwise pile up in memory. */
    it('is behind while more than the threshold waits for the spill, until it catches up', async () => {
        const { port, release } = stalledPort(10);
        const reader = BodyReader.start([], port);

        reader.onWireChunk(Buffer.alloc(10, 0x61));
        const atThreshold = reader.behind;

        // The spill opens and starts its first write, which waits for the disk.
        await new Promise(setImmediate);
        reader.onWireChunk(Buffer.alloc(4, 0x62));
        const pastThreshold = reader.behind;

        release();
        await reader.caughtUp();

        expect(atThreshold).toBe(false);
        expect(pastThreshold).toBe(true);
        expect(reader.behind).toBe(false);
        await expect(reader.finish()).resolves.toMatchObject({ body: { bytes: 14 } });
    });

    it('catches up, and is no longer behind, when the spill fails to write', async () => {
        const reader = BodyReader.start([], {
            thresholdBytes: 4,
            open: () =>
                Promise.resolve({
                    ...memorySpill(),
                    write: () => Promise.reject(new Error('the disk is full')),
                }),
        });

        reader.onWireChunk(Buffer.alloc(6, 0x61));
        await new Promise(setImmediate);
        reader.onWireChunk(Buffer.alloc(6, 0x62));
        await reader.caughtUp();

        expect(reader.behind).toBe(false);
        await expect(reader.finish()).rejects.toThrow('the disk is full');
    });
});
