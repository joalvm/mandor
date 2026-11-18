import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodiesDir, bodyFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { saveBody } from '../../../../src/main/request/save-body.js';

const REF = 'c'.repeat(64);

let root: string;
let target: string;

function choose(path: string | null) {
    return () => Promise.resolve(path);
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-save-body-'));
    target = join(root, 'saved.bin');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('saving a body where the user picks', () => {
    it('writes the text the window still holds', async () => {
        const answer = await saveBody(root, choose(target), {
            encoding: 'utf8',
            text: 'héllo',
            suggestedName: 'a.txt',
        });

        expect(answer).toEqual({ ok: true, value: { path: target } });
        expect(await readFile(target, 'utf8')).toBe('héllo');
    });

    it('writes the bytes of a base64 body, whole', async () => {
        await saveBody(root, choose(target), {
            encoding: 'base64',
            data: '//4AgA==',
            suggestedName: 'a.bin',
        });

        expect([...(await readFile(target))]).toEqual([0xff, 0xfe, 0x00, 0x80]);
    });

    it('copies a body that went to disk', async () => {
        await mkdir(bodiesDir(root), { recursive: true });
        await writeFile(bodyFile(root, REF), Buffer.from([1, 2, 3]));

        await saveBody(root, choose(target), { ref: REF, suggestedName: 'big.bin' });

        expect([...(await readFile(target))]).toEqual([1, 2, 3]);
    });

    it('proposes the name the window suggested', async () => {
        const asked: string[] = [];

        await saveBody(
            root,
            (name) => {
                asked.push(name);

                return Promise.resolve(null);
            },
            { encoding: 'utf8', text: 'x', suggestedName: 'response.json' },
        );

        expect(asked).toEqual(['response.json']);
    });

    it('writes nothing when the dialog is closed', async () => {
        const answer = await saveBody(root, choose(null), {
            encoding: 'utf8',
            text: 'x',
            suggestedName: 'a.txt',
        });

        expect(answer).toEqual({ ok: true, value: { path: null } });
    });

    it('refuses to copy a body that is not there', async () => {
        const answer = await saveBody(root, choose(target), { ref: REF, suggestedName: 'x' });

        expect(answer).toMatchObject({ ok: false, error: { code: 'request-file' } });
    });
});
