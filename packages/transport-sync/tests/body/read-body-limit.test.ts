import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { BodyReader } from '../../src/body/read-body.js';
import type { SpillPort } from '../../src/request/sync-request.js';
import { memorySpill } from '../support/memory-spill.js';

function port(spill: ReturnType<typeof memorySpill>, thresholdBytes = 1 << 20): SpillPort {
    return {
        thresholdBytes,
        open: () => Promise.resolve(spill),
    };
}

describe('BodyReader under the size limit of the request', () => {
    it('fails with too-large and discards the spill when the body grows past the limit', async () => {
        const spill = memorySpill();
        const reader = BodyReader.start([], port(spill, 4), 8);

        reader.onWireChunk(Buffer.alloc(6, 0x65));
        expect(reader.failure).toBeUndefined();
        reader.onWireChunk(Buffer.alloc(6, 0x65));
        expect(reader.failure).toMatchObject({ reason: 'too-large' });

        await expect(reader.finish()).rejects.toMatchObject({ reason: 'too-large' });
        expect(spill.written()).toHaveLength(6);
        expect(spill.finished()).toBe(false);
        expect(spill.aborted()).toBe(true);
    });

    /** A small gzip can open into a huge body: the limit counts what it decodes to. */
    it('counts the decoded bytes against the limit, not only the wire', async () => {
        const reader = BodyReader.start(['gzip'], port(memorySpill()), 1_000);

        reader.onWireChunk(gzipSync(Buffer.alloc(10_000, 0x66)));

        await expect(reader.finish()).rejects.toMatchObject({ reason: 'too-large' });
    });

    /** A gzip bomb: a few bytes on the wire open into far more than the limit, all in one chunk. */
    it('stops decoding the moment the body passes the limit, and keeps nothing past it', async () => {
        const spill = memorySpill();
        const reader = BodyReader.start(['gzip'], port(spill, 10), 40_000);

        reader.onWireChunk(gzipSync(Buffer.alloc(1 << 20)));

        await expect(reader.finish()).rejects.toMatchObject({ reason: 'too-large' });
        expect(spill.written().length).toBeLessThanOrEqual(40_000);
        expect(spill.aborted()).toBe(true);
    });
});
