import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { createGunzip, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { endOf, wirePipe } from '../../src/body/wire-pipe.js';

function drained(outlet: NodeJS.ReadableStream): Buffer[] {
    const chunks: Buffer[] = [];

    outlet.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
    });

    return chunks;
}

describe('wirePipe', () => {
    it('decodes what is pushed into the wire through every transform, in order', async () => {
        const pipe = wirePipe([createGunzip(), new PassThrough()]);
        const chunks = drained(pipe.outlet);
        const ended = endOf(pipe.outlet);

        pipe.wire.push(gzipSync(Buffer.from('hola')));
        pipe.wire.push(null);
        await ended;

        expect(Buffer.concat(chunks).toString()).toBe('hola');
    });

    it('settles, without throwing, when the decoded side fails', async () => {
        const pipe = wirePipe([createGunzip()]);
        const failures: Error[] = [];

        pipe.outlet.on('error', (error: Error) => {
            failures.push(error);
        });

        const ended = endOf(pipe.outlet);

        pipe.wire.push(Buffer.from('not gzip at all'));
        pipe.wire.push(null);
        await ended;

        expect(failures).toHaveLength(1);
    });

    /** The decoding can break before the response ends: waiting for it afterwards still settles. */
    it('settles for a decoded side that failed before anyone waited for it', async () => {
        const pipe = wirePipe([createGunzip()]);
        const failed = once(pipe.outlet, 'error');

        pipe.wire.push(Buffer.from('not gzip at all'));
        await failed;

        await expect(endOf(pipe.outlet)).resolves.toBeUndefined();
    });

    /** An earlier transform failing must reach the decoded side, not escape as an uncaught error. */
    it('reports on the decoded side a failure of a transform before the last', async () => {
        const pipe = wirePipe([createGunzip(), createGunzip()]);
        const failures: Error[] = [];

        pipe.outlet.on('error', (error: Error) => {
            failures.push(error);
        });

        const ended = endOf(pipe.outlet);

        pipe.wire.push(Buffer.from('not gzip at all'));
        pipe.wire.push(null);
        await ended;

        expect(failures).toHaveLength(1);
    });
});
