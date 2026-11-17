import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseWorkspace } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readDocument } from '../../src/disk/read-document.js';
import { writeDocument } from '../../src/disk/write-document.js';

const original = [
    '# Workspace de pagos',
    'kind: async',
    'id: eventos-pagos',
    'name: Eventos de pagos',
    'color: teal # lo escribe la otra app',
    '',
].join('\n');

let root: string;
let path: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    path = join(root, 'workspace.yaml');

    await writeFile(path, original, 'utf8');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function rename(name: string): Promise<string> {
    const read = await readDocument(path, parseWorkspace);

    if (!read.ok) {
        throw new Error(read.warning.message);
    }

    await writeDocument(path, read.document, { name });

    return readFile(path, 'utf8');
}

describe('writing a loaded document', () => {
    it('applies the change to the file', async () => {
        expect(await rename('Pagos')).toContain('name: Pagos');
    });

    /** Losing a key written by the other app is how one app corrupts the other's workspace. */
    it('keeps comments, key order and keys the schema does not know', async () => {
        const written = await rename('Pagos');

        expect(written).toContain('# Workspace de pagos');
        expect(written).toContain('color: teal # lo escribe la otra app');
        expect(written.indexOf('kind:')).toBeLessThan(written.indexOf('id:'));
    });

    /** `.gitattributes` says `eol=lf`; a file written with CRLF would show up as a whole-file diff. */
    it('ends the file in a single newline and never in CRLF', async () => {
        const written = await rename('Pagos');

        expect(written.endsWith('\n')).toBe(true);
        expect(written.endsWith('\n\n')).toBe(false);
        expect(written).not.toContain('\r');
    });

    /**
     * A field somebody emptied is a field that is no longer there. Writing it back as blank or
     * as null would leave the file saying a thing the person removed on purpose.
     */
    it('removes a key a change left undefined, and nothing else', async () => {
        const read = await readDocument(path, parseWorkspace);

        if (!read.ok) {
            throw new Error(read.warning.message);
        }

        await writeDocument(path, read.document, { color: undefined });

        const written = await readFile(path, 'utf8');

        expect(written).not.toContain('color');
        expect(written).toContain('# Workspace de pagos');
        expect(written).toContain('name: Eventos de pagos');
    });

    /** Wrapping a long value turns one edited field into a multi-line diff. */
    it('never wraps a long value', async () => {
        const written = await rename('Pagos '.repeat(30).trim());

        expect(written.split('\n').filter((line) => line.startsWith('name:'))).toHaveLength(1);
    });
});
