import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, parseWorkspace } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { documentOf } from '../../src/index.js';
import { readDocument } from '../../src/disk/read-document.js';
import { writeDocument } from '../../src/disk/write-document.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('building a document for a new file', () => {
    it('keeps the key order the domain factory produced', async () => {
        const path = join(root, 'workspace.yaml');
        const workspace = createWorkspace({
            id: 'eventos-de-pagos',
            name: 'Eventos de pagos',
            kind: 'async',
        });

        await writeDocument(path, documentOf(workspace), {});

        expect(await readFile(path, 'utf8')).toBe(
            'id: eventos-de-pagos\nkind: async\nname: Eventos de pagos\n',
        );
    });

    it('produces a file the reader accepts back', async () => {
        const path = join(root, 'workspace.yaml');
        const workspace = createWorkspace({
            id: 'eventos-de-pagos',
            name: 'Eventos de pagos',
            kind: 'async',
        });

        await writeDocument(path, documentOf(workspace), {});

        const read = await readDocument(path, parseWorkspace);

        expect(read.ok && read.value).toEqual(workspace);
    });

    /** An optional field nobody filled in is absent from the file, never a null sitting there. */
    it('leaves out a key nobody set', async () => {
        const path = join(root, 'item.yaml');

        await writeDocument(path, documentOf({ name: 'pedido creado', channel: undefined }), {});

        expect(await readFile(path, 'utf8')).toBe('name: pedido creado\n');
    });

    it('indents nested content by two spaces', async () => {
        const path = join(root, 'mandor.yaml');

        await writeDocument(path, documentOf({ workspaces: ['api-pagos'] }), {});

        expect(await readFile(path, 'utf8')).toBe('workspaces:\n  - api-pagos\n');
    });
});
