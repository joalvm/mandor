import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { ConflictRecord } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clashOfRecord } from '../../src/conflict/clash-of-record.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-clash-'));
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

function request(method: string): string {
    return `name: Login\nmethod: ${method}\nurl: /login\nheaders: []\n`;
}

function recordOf(path: string, base: string | null, theirs: string | null): ConflictRecord {
    return { path, source: 'merge', base, theirs, at: '2026-10-07T10:00:00.000Z' };
}

async function put(path: string, text: string): Promise<void> {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text, 'utf8');
}

const ITEM = 'workspaces/pagos/collections/login.yaml';

describe('working the questions of a clash out again (clash-of-record)', () => {
    it('asks again about what still clashes, naming it by the name the file carries', async () => {
        await put(ITEM, request('PATCH'));

        const clash = await clashOfRecord(root, recordOf(ITEM, request('POST'), request('PUT')));

        expect(clash?.entity).toEqual({ area: 'collections', workspaceId: 'pagos', path: 'login' });
        expect(clash?.name).toBe('Login');
        expect(clash?.conflicts.map((each) => each.id)).toEqual(['method']);
    });

    it('counts what was edited after the provisional version as this side', async () => {
        await put(ITEM, request('PUT'));

        await expect(
            clashOfRecord(root, recordOf(ITEM, request('POST'), request('PUT'))),
        ).resolves.toBeNull();
    });

    it('takes a file that is gone as a side that is not there', async () => {
        const clash = await clashOfRecord(root, recordOf(ITEM, request('POST'), request('PUT')));

        expect(clash?.conflicts).toHaveLength(1);
        expect(clash?.conflicts[0]?.ours).toBeNull();
    });

    /** A file locked or out of reach is not a deleted one: a merge would answer for it. */
    it('lets a file that is there but cannot be read through as a failure', async () => {
        await mkdir(join(root, ITEM), { recursive: true });

        await expect(
            clashOfRecord(root, recordOf(ITEM, request('POST'), request('PUT'))),
        ).rejects.toMatchObject({ code: 'EISDIR' });
    });

    it('names a doc by its title, and a workspace by the name it carries', async () => {
        const doc = 'workspaces/pagos/docs/notes.md';
        const workspace = 'workspaces/pagos/workspace.yaml';

        await put(doc, 'ONE\n');
        await put(workspace, 'name: A\n');

        expect((await clashOfRecord(root, recordOf(doc, 'one\n', 'Uno\n')))?.name).toBe('notes');
        expect(
            (await clashOfRecord(root, recordOf(workspace, 'name: B\n', 'name: C\n')))?.name,
        ).toBe('A');
    });

    it('names a file that is gone by the name the other side wrote, or the base had', async () => {
        const theirs = 'name: Suyo\nmethod: PUT\n';
        const base = 'name: Antes\nmethod: POST\n';

        expect((await clashOfRecord(root, recordOf(ITEM, base, theirs)))?.name).toBe('Suyo');
        expect((await clashOfRecord(root, recordOf(ITEM, base, 'method: PUT\n')))?.name).toBe(
            'Antes',
        );
    });

    it('names the order of the collections of a workspace by its workspace', async () => {
        const order = 'workspaces/pagos/collections/collections.yaml';

        await put('workspaces/pagos/workspace.yaml', 'name: Tienda\n');
        await put(order, 'order: mine\n');

        const clash = await clashOfRecord(
            root,
            recordOf(order, 'order: base\n', 'order: theirs\n'),
        );

        expect(clash?.name).toBe('Tienda');
    });

    it('gives no name to a file out of the shape of a repo, listed as the repo itself', async () => {
        const path = 'workspaces/pagos/stuff.txt';

        await put(path, 'mine\n');

        const clash = await clashOfRecord(root, recordOf(path, 'base\n', 'theirs\n'));

        expect(clash?.entity).toEqual({ area: 'repo' });
        expect(clash?.name).toBe('');
    });
});
