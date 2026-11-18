import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import { createWorkspace, docFile, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { removeDocEntry, writeDocEntry } from '../../src/import/write-doc-entry.js';

const origin = { kind: 'openapi', sourceId: 'shop' } as const;

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-doc-entry-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'shop', name: 'Shop', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function entryOf(fields: Record<string, unknown>): ImportPlanEntry {
    return {
        class: 'add',
        place: 'doc',
        route: 'guia.md',
        name: 'guia.md',
        selected: true,
        resource: {
            place: 'doc',
            itemKind: null,
            route: 'guia.md',
            name: 'guia.md',
            fields,
            origin,
            degradations: [],
        },
    };
}

describe('writing a doc of an import', () => {
    it('writes the note under the name of its route, with its text exactly as it came', async () => {
        await writeDocEntry(root, 'shop', entryOf({ text: '# Guía\n\nPrimero, el token.\n' }));

        await expect(readFile(docFile(root, 'shop', 'guia.md'), 'utf8')).resolves.toBe(
            '# Guía\n\nPrimero, el token.\n',
        );
    });

    it('refuses a note that carries no text instead of writing an empty one', async () => {
        await expect(writeDocEntry(root, 'shop', entryOf({}))).rejects.toThrow(/carries no text/u);
    });

    it('never removes a note: it names no origin, so no import wrote it', async () => {
        await expect(removeDocEntry(root, 'shop', 'guia.md')).rejects.toThrow(/never removes/u);
    });
});
