import { mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseWorkspace } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readDocument } from '../../src/disk/read-document.js';
import { MAX_FILE_BYTES } from '../../src/disk/read-file-text.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function write(name: string, source: string): Promise<string> {
    const path = join(root, name);

    await writeFile(path, source, 'utf8');

    return path;
}

describe('reading a document', () => {
    it('returns the validated value of a well formed file', async () => {
        const path = await write('workspace.yaml', 'id: api-pagos\nkind: sync\nname: Api pagos\n');
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok).toBe(true);
        expect(read.ok && read.value).toEqual({
            id: 'api-pagos',
            kind: 'sync',
            name: 'Api pagos',
        });
        expect(read.ok && read.document.toString()).toContain('id: api-pagos');
    });

    /** The other app writes keys this one does not know. Losing them corrupts its data. */
    it('keeps unknown keys in the document it returns', async () => {
        const path = await write(
            'workspace.yaml',
            '# título\nid: api-pagos\nkind: sync\nname: Api pagos\ncolor: teal\n',
        );
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok).toBe(true);
        expect(read.ok && read.document.toString()).toContain('color: teal');
        expect(read.ok && read.document.toString()).toContain('# título');
    });

    it('reports broken YAML as a warning naming the file', async () => {
        const path = await write('workspace.yaml', 'id: [api-pagos\nkind: sync\n');
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok).toBe(false);
        expect(read.ok ? null : read.warning.path).toBe(path);
        expect(read.ok ? null : read.warning.message).not.toBe('');
    });

    /** The warning says whose file it is by the name the file carries, never by its path. */
    it('carries the name of a file it could not parse', async () => {
        const path = await write('item.yaml', 'name: Pedido roto\nurl: [unclosed\n');
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok ? null : read.warning.name).toBe('Pedido roto');
    });

    it('carries the name of a file the schema rejects', async () => {
        const path = await write('workspace.yaml', 'name: Api pagos\nkind: carrier-pigeon\n');
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok ? null : read.warning.name).toBe('Api pagos');
    });

    it('carries no name for a file that has none or is gone', async () => {
        const nameless = await write('nameless.yaml', 'id: [broken\n');
        const gone = join(root, 'nowhere.yaml');

        for (const path of [nameless, gone]) {
            const read = await readDocument(path, parseWorkspace);

            expect(read.ok ? null : 'name' in read.warning).toBe(false);
        }
    });

    it('reports content the schema rejects as a warning', async () => {
        const path = await write('workspace.yaml', 'id: api-pagos\nkind: carrier-pigeon\n');
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok).toBe(false);
        expect(read.ok ? null : read.warning.path).toBe(path);
    });

    /** One file too large to read costs that file, like a broken one, and not the repo. */
    it('reports a file past the cap as a warning without parsing it', async () => {
        const path = await write('workspace.yaml', 'id: api-pagos\nkind: sync\nname: Api pagos\n');

        await truncate(path, MAX_FILE_BYTES + 1);

        const read = await readDocument(path, parseWorkspace);

        expect(read.ok ? null : Object.keys(read.warning)).toEqual(['path', 'message']);
        expect(read.ok ? '' : read.warning.message).toMatch(/64 MiB/);
    });

    it('reports a missing file as a warning instead of throwing', async () => {
        const path = join(root, 'nowhere.yaml');
        const read = await readDocument(path, parseWorkspace);

        expect(read.ok).toBe(false);
        expect(read.ok ? null : read.warning.path).toBe(path);
    });
});
