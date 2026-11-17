import { Readable, type Transform } from 'node:stream';
import { brotliCompressSync, deflateSync, gzipSync, zstdCompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { decoderOf } from '../../src/body/decoder-of.js';

/** The transforms a decoding must produce: the test stops here if the encoding was refused. */
function known(transforms: Transform[] | null): Transform[] {
    if (transforms === null) {
        throw new Error('the encoding was refused');
    }

    return transforms;
}

/** Feeds one chunk through the transforms and collects what comes out the other end. */
function through(transforms: Transform[], input: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let current: NodeJS.ReadableStream = Readable.from([input]);

        for (const transform of transforms) {
            current = current.pipe(transform);
        }

        const chunks: Buffer[] = [];

        current.on('data', (chunk: Buffer) => chunks.push(chunk));
        current.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        current.on('error', reject);
    });
}

describe('decoderOf', () => {
    it('returns no transform when there is no content-encoding', () => {
        expect(decoderOf([])).toBeNull();
    });

    it('returns no transform for an encoding it does not know', () => {
        expect(decoderOf(['compress'])).toBeNull();
    });

    it('decodes gzip, and x-gzip like gzip', async () => {
        const transforms = decoderOf(['gzip']);

        expect(transforms).toHaveLength(1);
        await expect(through(known(transforms), gzipSync(Buffer.from('gzipped')))).resolves.toEqual(
            Buffer.from('gzipped'),
        );
        expect(decoderOf(['x-gzip'])).toHaveLength(1);
    });

    it('decodes deflate', async () => {
        const transforms = known(decoderOf(['deflate']));

        await expect(through(transforms, deflateSync(Buffer.from('deflated')))).resolves.toEqual(
            Buffer.from('deflated'),
        );
    });

    it('decodes br', async () => {
        const transforms = known(decoderOf(['br']));

        await expect(
            through(transforms, brotliCompressSync(Buffer.from('brotlied'))),
        ).resolves.toEqual(Buffer.from('brotlied'));
    });

    it('decodes zstd', async () => {
        const transforms = known(decoderOf(['zstd']));

        await expect(through(transforms, zstdCompressSync(Buffer.from('zstded')))).resolves.toEqual(
            Buffer.from('zstded'),
        );
    });

    /** The header lists codings in the order they were applied, so the last one is undone first. */
    it('undoes several encodings from the last the header names to the first', async () => {
        const deflated = deflateSync(Buffer.from('twice'));
        const wire = gzipSync(deflated);
        const transforms = known(decoderOf(['deflate', 'gzip']));

        await expect(through(transforms, wire)).resolves.toEqual(Buffer.from('twice'));
    });

    it('undoes up to five encodings, as curl does', async () => {
        let wire = Buffer.from('five times');

        for (let layer = 0; layer < 5; layer += 1) {
            wire = gzipSync(wire);
        }

        const transforms = known(decoderOf(Array.from({ length: 5 }, () => 'gzip')));

        await expect(through(transforms, wire)).resolves.toEqual(Buffer.from('five times'));
    });

    /** Thousands of `gzip` fit in one header, and each one is a decoder the response keeps busy. */
    it('refuses a header that stacks more than five encodings', () => {
        expect(decoderOf(Array.from({ length: 6 }, () => 'gzip'))).toBeNull();
    });

    it('refuses the whole header when any of its encodings is unknown', () => {
        expect(decoderOf(['gzip', 'compress'])).toBeNull();
    });

    /** The header is the server's: a name an object already answers to is still unknown. */
    it.each(['constructor', '__proto__'])(
        'refuses an encoding named like a property every object has: %s',
        (name) => {
            expect(decoderOf([name])).toBeNull();
        },
    );
});
