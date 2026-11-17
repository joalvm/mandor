import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import { readGlobals, writeGlobals, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { keepGlobals, writeGlobalsEntry } from '../../src/import/write-globals-entry.js';

let root: string;

function variable(name: string, value: string, secret = false) {
    return { name, value, enabled: true, secret };
}

function entryOf(variables: unknown[]): ImportPlanEntry {
    return {
        class: 'add',
        selected: true,
        place: 'globals',
        route: '.',
        name: 'Globals',
        resource: {
            place: 'globals',
            itemKind: null,
            route: '.',
            name: 'Globals',
            fields: { variables },
            origin: { kind: 'postman', sourceId: 'globals:1', fingerprint: 'f' },
            degradations: [],
        },
    };
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-globals-entry-'));

    await writeRepoTree(root, 'Demo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writeGlobalsEntry', () => {
    it('adds the names the origin lacks, a secret with its mark, and keeps every value it had', async () => {
        await writeGlobals(root, { variables: [variable('region', 'us')] });

        await writeGlobalsEntry(
            root,
            'tienda',
            entryOf([variable('region', 'eu'), variable('token', '', true)]),
        );

        expect(await readGlobals(root)).toEqual({
            variables: [variable('region', 'us'), variable('token', '', true)],
        });
    });

    it('leaves the globals of the origin alone when the import of a workspace is undone', async () => {
        await writeGlobals(root, { variables: [variable('region', 'us')] });
        await keepGlobals();

        expect(await readGlobals(root)).toEqual({ variables: [variable('region', 'us')] });
    });
});
