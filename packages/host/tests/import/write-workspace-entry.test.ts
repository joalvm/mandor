import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import { createWorkspace, writeRepoTree, readWorkspace } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeWorkspaceEntry } from '../../src/import/write-workspace-entry.js';

const origin = { kind: 'openapi', sourceId: 'shop', fingerprint: 'f1' } as const;

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-entry-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'shop', name: 'Shop', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function entryOf(auth: unknown, more: Record<string, unknown> = {}): ImportPlanEntry {
    return {
        class: 'add',
        place: 'workspace',
        route: '.',
        name: 'Shop',
        selected: true,
        resource: {
            place: 'workspace',
            itemKind: null,
            route: '.',
            name: 'Shop',
            fields: { auth, ...more },
            origin,
            degradations: [],
        },
    };
}

describe('writeWorkspaceEntry', () => {
    it('writes the auth of the document into the workspace file with its origin', async () => {
        await writeWorkspaceEntry(
            root,
            'shop',
            entryOf({ type: 'bearer', token: '{{token}}' }),
            origin,
        );

        const read = await readWorkspace(root, 'shop');

        expect(read.ok && read.value.auth).toEqual({ type: 'bearer', token: '{{token}}' });
        expect(read.ok && read.value.importOrigin).toEqual(origin);
    });

    it('takes the auth out when the entry carries none', async () => {
        await writeWorkspaceEntry(root, 'shop', entryOf({ type: 'bearer', token: 't' }), origin);
        await writeWorkspaceEntry(root, 'shop', entryOf(null), origin);

        const read = await readWorkspace(root, 'shop');

        expect(read.ok && read.value.auth).toBeUndefined();
    });

    it('reads inherit as no auth at all', async () => {
        await writeWorkspaceEntry(root, 'shop', entryOf({ type: 'bearer', token: 't' }), origin);
        await writeWorkspaceEntry(root, 'shop', entryOf({ inherit: true }), origin);

        const read = await readWorkspace(root, 'shop');

        expect(read.ok && read.value.auth).toBeUndefined();
    });

    it('writes no variables and no scripts: the workspace keeps neither', async () => {
        const variables = [{ name: 'host', value: 'a', enabled: true, secret: false }];
        const scripts = { onResponse: { source: 'b()' } };
        const entry = entryOf(null, { variables, scripts });

        await writeWorkspaceEntry(root, 'shop', entry, origin);

        const read = await readWorkspace(root, 'shop');

        expect(read.ok && 'variables' in read.value).toBe(false);
        expect(read.ok && 'scripts' in read.value).toBe(false);
    });
});
