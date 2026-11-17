import { createHash } from 'node:crypto';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { BodyReader } from '../../src/body/read-body.js';
import type { SyncBody } from '../../src/response/sync-body.js';
import type { SyncSizes } from '../../src/response/sync-sizes.js';
import type { SpillPort } from '../../src/request/sync-request.js';
import { memorySpill } from '../support/memory-spill.js';

function port(spill: ReturnType<typeof memorySpill>, thresholdBytes = 1 << 20): SpillPort {
    return {
        thresholdBytes,
        open: () => Promise.resolve(spill),
    };
}

function sha256(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

describe('BodyReader', () => {
    it('keeps a small body inline with its sizes', async () => {
        const reader = BodyReader.start([], port(memorySpill()));

        reader.onWireChunk(Buffer.from('small body'));
        const outcome = await reader.finish();

        expect(outcome.body).toEqual({ kind: 'inline', bytes: Buffer.from('small body') });
        expect(outcome.sizes).toEqual({ transferredBytes: 10, bodyBytes: 10, decoded: true });
    });

    it('decodes gzip and counts transferred apart from decoded', async () => {
        const wire = gzipSync(Buffer.from('the gzip body'));
        const reader = BodyReader.start(['gzip'], port(memorySpill()));

        reader.onWireChunk(wire);
        const outcome = await reader.finish();

        expect(outcome.body).toEqual({ kind: 'inline', bytes: Buffer.from('the gzip body') });
        expect(outcome.sizes.transferredBytes).toBe(wire.length);
        expect(outcome.sizes.bodyBytes).toBe(13);
        expect(outcome.sizes.decoded).toBe(true);
    });

    it('decodes deflate and br', async () => {
        const deflate = BodyReader.start(['deflate'], port(memorySpill()));

        deflate.onWireChunk(deflateSync(Buffer.from('deflated')));
        await expect(deflate.finish()).resolves.toEqual({
            body: { kind: 'inline', bytes: Buffer.from('deflated') },
            sizes: {
                transferredBytes: deflateSync(Buffer.from('deflated')).length,
                bodyBytes: 8,
                decoded: true,
            },
        });

        const brotli = BodyReader.start(['br'], port(memorySpill()));

        brotli.onWireChunk(brotliCompressSync(Buffer.from('brotlied')));
        expect(
            Buffer.from(
                ((await brotli.finish()).body as unknown as { bytes: Buffer }).bytes,
            ).toString(),
        ).toBe('brotlied');
    });

    it('leaves an unknown encoding raw and says so', async () => {
        const reader = BodyReader.start(['compress'], port(memorySpill()));

        reader.onWireChunk(Buffer.from('mystery bytes'));
        const outcome = await reader.finish();

        expect(outcome.body).toEqual({ kind: 'inline', bytes: Buffer.from('mystery bytes') });
        expect(outcome.sizes.decoded).toBe(false);
    });

    it('decodes several encodings, the last one the header names first', async () => {
        const reader = BodyReader.start(['deflate', 'gzip'], port(memorySpill()));

        reader.onWireChunk(gzipSync(deflateSync(Buffer.from('twice gzipped'))));
        expect(
            Buffer.from(
                ((await reader.finish()).body as unknown as { bytes: Buffer }).bytes,
            ).toString(),
        ).toBe('twice gzipped');
    });

    it('spills a body over the threshold and reports reference, count and hash', async () => {
        const spill = memorySpill();
        const big = Buffer.alloc(3 * (1 << 20), 0x61);
        const reader = BodyReader.start([], port(spill));

        reader.onWireChunk(big.subarray(0, 2 << 20));
        reader.onWireChunk(big.subarray(2 << 20));
        const outcome = await reader.finish();
        const body: SyncBody = outcome.body;
        const sizes: SyncSizes = outcome.sizes;

        expect(body).toEqual({
            kind: 'spilled',
            ref: 'spill-ref',
            bytes: big.length,
            sha256: sha256(big),
        });
        expect(sizes).toEqual({
            transferredBytes: big.length,
            bodyBytes: big.length,
            decoded: true,
        });
        expect(spill.written().equals(big)).toBe(true);
        expect(spill.finished()).toBe(true);
        expect(spill.aborted()).toBe(false);
    });

    it('keeps writing into the spill as more decoded bytes arrive', async () => {
        const spill = memorySpill();
        const big = Buffer.alloc(3 * (1 << 20), 0x64);
        const reader = BodyReader.start(['gzip'], port(spill));

        reader.onWireChunk(gzipSync(big));
        const outcome = await reader.finish();

        expect(outcome.body).toEqual({
            kind: 'spilled',
            ref: 'spill-ref',
            bytes: big.length,
            sha256: sha256(big),
        });
        expect(outcome.sizes).toEqual({
            transferredBytes: gzipSync(big).length,
            bodyBytes: big.length,
            decoded: true,
        });
        expect(spill.written().equals(big)).toBe(true);
    });

    it('aborts a body that was still inline without touching any spill', async () => {
        const spill = memorySpill();
        const reader = BodyReader.start([], port(spill));

        reader.onWireChunk(Buffer.from('tiny'));
        await reader.abort();

        expect(spill.finished()).toBe(false);
        expect(spill.aborted()).toBe(false);
    });

    it('aborts the spill when the body dies mid-read', async () => {
        const spill = memorySpill();
        const big = Buffer.alloc(2 * (1 << 20), 0x62);
        const reader = BodyReader.start([], port(spill));

        reader.onWireChunk(big);
        await reader.abort();

        expect(spill.aborted()).toBe(true);
        expect(spill.finished()).toBe(false);
    });

    it('fails, and discards nothing silently, when the spill cannot open', async () => {
        const reader = BodyReader.start([], {
            thresholdBytes: 1,
            open: () => Promise.reject(new Error('the disk is full')),
        });

        reader.onWireChunk(Buffer.alloc(4, 0x63));
        await expect(reader.finish()).rejects.toThrow('the disk is full');
    });

    /** The write fails while the body still arrives: its failure is kept for finish, not left unheard. */
    it('names a spill that failed mid-body as its failure, until it finishes', async () => {
        const reader = BodyReader.start([], {
            thresholdBytes: 4,
            open: () =>
                Promise.resolve({
                    ...memorySpill(),
                    write: () => Promise.reject(new Error('the disk is full')),
                }),
        });

        reader.onWireChunk(Buffer.alloc(6, 0x63));
        // The spill opens and its first write fails before the next chunk arrives.
        await new Promise(setImmediate);

        expect(reader.failure).toMatchObject({ message: 'the disk is full' });
        await expect(reader.finish()).rejects.toThrow('the disk is full');
    });

    it('names as an error what a spill threw that was not one', async () => {
        const reader = BodyReader.start([], {
            thresholdBytes: 1,
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a spill is the app's code, and can throw anything
            open: () => Promise.reject('the disk is gone'),
        });

        reader.onWireChunk(Buffer.alloc(4, 0x63));

        await expect(reader.finish()).rejects.toThrow('the disk is gone');
    });

    it('discards the spill when writing into it fails', async () => {
        const spill = memorySpill();
        const reader = BodyReader.start([], {
            thresholdBytes: 1,
            open: () =>
                Promise.resolve({
                    ...spill,
                    write: () => Promise.reject(new Error('the disk is full')),
                }),
        });

        reader.onWireChunk(Buffer.alloc(4, 0x63));

        await expect(reader.finish()).rejects.toThrow('the disk is full');
        expect(spill.aborted()).toBe(true);
    });

    /** Half a body is not a body: the file it was pouring into goes too. */
    it('discards the spill when the encoding breaks after the body started spilling', async () => {
        const spill = memorySpill();
        const whole = gzipSync(Buffer.alloc(100_000, 0x64));
        const reader = BodyReader.start(['gzip'], port(spill, 10));

        reader.onWireChunk(whole.subarray(0, -8));

        await expect(reader.finish()).rejects.toThrow();
        expect(spill.written().length).toBeGreaterThan(0);
        expect(spill.aborted()).toBe(true);
    });

    it('fails with the decoding error when the wire carries broken encodings', async () => {
        const reader = BodyReader.start(['gzip'], port(memorySpill()));

        reader.onWireChunk(Buffer.from('this is not gzip'));
        await expect(reader.finish()).rejects.toThrow();
    });

    it('fails with the decoding error when the first of two encodings to undo is broken', async () => {
        const reader = BodyReader.start(['gzip', 'gzip'], port(memorySpill()));

        reader.onWireChunk(Buffer.from('this is not gzip'));
        await expect(reader.finish()).rejects.toThrow();
    });
});
