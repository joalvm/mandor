import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry } from '@mandor/interop-core';
import {
    createWorkspace,
    writeRepoTree,
    listEnvironments,
    readEnvironment,
    writeEnvironment,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeEnvironmentEntry } from '../../src/import/write-environment-entry.js';

const origin = { kind: 'openapi', sourceId: 'shop', fingerprint: 'f1' } as const;

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-env-entry-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'shop', name: 'Shop', kind: 'sync' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function variable(name: string, value: string) {
    return { name, value, enabled: true, secret: false };
}

function entryOf(
    class_: 'add' | 'update',
    name: string,
    variables: ReturnType<typeof variable>[],
): ImportPlanEntry {
    return {
        class: class_,
        place: 'environment',
        route: 'production',
        name,
        selected: true,
        resource: {
            place: 'environment',
            itemKind: null,
            route: 'production',
            name,
            fields: { name, variables },
            origin,
            degradations: [],
        },
    };
}

describe('writeEnvironmentEntry', () => {
    it('creates the environment with the variables the document gave it and its origin', async () => {
        await writeEnvironmentEntry(
            root,
            'shop',
            entryOf('add', 'Production', [variable('baseUrl', 'https://shop.example')]),
            origin,
        );

        expect(await readEnvironment(root, 'shop', 'production')).toEqual({
            id: 'production',
            name: 'Production',
            variables: [variable('baseUrl', 'https://shop.example')],
            origin,
        });
    });

    it('keeps the value a person filled in and adds only the variable that is new', async () => {
        await writeEnvironment(root, 'shop', {
            id: 'production',
            name: 'Production',
            variables: [variable('baseUrl', 'https://mine.example'), variable('extra', 'mine')],
            origin,
        });

        await writeEnvironmentEntry(
            root,
            'shop',
            entryOf('update', 'Prod', [
                variable('baseUrl', 'https://doc.example'),
                variable('token', ''),
            ]),
            origin,
        );

        const written = await readEnvironment(root, 'shop', 'production');

        expect(written.name).toBe('Prod');
        expect(written.variables).toEqual([
            variable('baseUrl', 'https://mine.example'),
            variable('extra', 'mine'),
            variable('token', ''),
        ]);
        expect((await listEnvironments(root, 'shop')).environments).toHaveLength(1);
    });
});
