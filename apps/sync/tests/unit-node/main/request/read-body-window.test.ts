import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodiesDir, bodyFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readBodyWindow } from '../../../../src/main/request/read-body-window.js';

let root: string;

async function store(bytes: Buffer): Promise<string> {
    const ref = createHash('sha256').update(bytes).digest('hex');

    await mkdir(bodiesDir(root), { recursive: true });
    await writeFile(bodyFile(root, ref), bytes);

    return ref;
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-body-window-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reading a window of a body on disk', () => {
    it('gives the window asked for, as text, with the size of the whole body', async () => {
        const ref = await store(Buffer.from('0123456789'));

        expect(await readBodyWindow(root, { ref, offset: 2, length: 4 })).toEqual({
            ok: true,
            value: { encoding: 'utf8', text: '2345', total: 10 },
        });
    });

    it('gives a window that is not text as base64', async () => {
        const ref = await store(Buffer.from([0xff, 0xfe, 0x00]));

        expect(await readBodyWindow(root, { ref, offset: 0, length: 10 })).toEqual({
            ok: true,
            value: { encoding: 'base64', data: '//4A', total: 3 },
        });
    });

    it('gives an empty window past the end of the body', async () => {
        const ref = await store(Buffer.from('abc'));

        expect(await readBodyWindow(root, { ref, offset: 50, length: 10 })).toEqual({
            ok: true,
            value: { encoding: 'utf8', text: '', total: 3 },
        });
    });

    it('refuses a body that is not on disk', async () => {
        expect(
            await readBodyWindow(root, { ref: 'a'.repeat(64), offset: 0, length: 1 }),
        ).toMatchObject({
            ok: false,
            error: { code: 'request-file' },
        });
    });
});
