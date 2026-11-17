import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodiesDir, bodyFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { diskBodySpill } from '../../../../src/main/request/disk-body-spill.js';

let root: string;

function hashOf(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-spill-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the spill that keeps a big body on disk', () => {
    it('writes the chunks and names the file by the hash of its bytes', async () => {
        const bytes = Buffer.from('hello big body');
        const spill = await diskBodySpill(root);

        await spill.write(bytes.subarray(0, 5));
        await spill.write(bytes.subarray(5));
        const ref = await spill.finish(hashOf(bytes));

        expect(ref).toBe(hashOf(bytes));
        expect(await readFile(bodyFile(root, ref))).toEqual(bytes);
        expect(await readdir(bodiesDir(root))).toEqual([ref]);
    });

    it('keeps one file when the same body arrives twice', async () => {
        const bytes = Buffer.from('same bytes');

        for (let sent = 0; sent < 2; sent += 1) {
            const spill = await diskBodySpill(root);

            await spill.write(bytes);
            await spill.finish(hashOf(bytes));
        }

        expect(await readdir(bodiesDir(root))).toEqual([hashOf(bytes)]);
    });

    /** Main killed mid-body neither finishes nor aborts its spill: the next run clears the half file. */
    it('clears the half bodies an earlier run left, and keeps the stored ones', async () => {
        const stored = Buffer.from('stored');

        await mkdir(bodiesDir(root), { recursive: true });
        await writeFile(join(bodiesDir(root), 'tmp-left-by-a-crash'), 'half');
        await writeFile(bodyFile(root, hashOf(stored)), stored);

        const spill = await diskBodySpill(root);

        await spill.write(Buffer.from('new'));

        expect((await readdir(bodiesDir(root))).sort()).toEqual(
            [hashOf(stored), expect.stringMatching(/^tmp-[0-9a-f-]{36}$/)].sort(),
        );
        await spill.abort();
    });

    it('never clears the half body of a spill in flight', async () => {
        const bodies = [Buffer.from('first'), Buffer.from('second'), Buffer.from('third')];
        const spills = await Promise.all(bodies.map(() => diskBodySpill(root)));

        await Promise.all(
            spills.map(async (spill, index) => {
                await spill.write(bodies[index] ?? Buffer.alloc(0));
                await spill.finish(hashOf(bodies[index] ?? Buffer.alloc(0)));
            }),
        );

        expect((await readdir(bodiesDir(root))).sort()).toEqual(bodies.map(hashOf).sort());
    });

    it('leaves nothing behind when the request dies mid-body', async () => {
        const spill = await diskBodySpill(root);

        await spill.write(Buffer.from('half'));
        await spill.abort();

        expect(await readdir(bodiesDir(root))).toEqual([]);
    });
});
