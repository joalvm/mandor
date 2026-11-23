import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    writeRepoTree,
    createWorkspace,
    writeEnvironment,
    writeImportedWorkspace,
} from '@mandor/store-fs';
import { fingerprintOf } from '@mandor/interop-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { existingResourcesOf } from '../../src/import/import-existing.js';
import { writeOldWorkspaceVariables } from '../support/old-workspace-variables.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-existing-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the envelopes existingResourcesOf already sees', () => {
    it('lists environments by name only, so a value the person filled in is not drift', async () => {
        const origin = { kind: 'openapi' as const, sourceId: 'shop' };
        const variables = [
            { name: 'baseUrl', value: 'https://mine.example', enabled: true, secret: false },
        ];

        await writeEnvironment(root, 'pasarela', { id: 'prod', name: 'Prod', variables, origin });

        expect(await existingResourcesOf(root, 'pasarela')).toEqual([
            {
                place: 'environment',
                route: 'prod',
                name: 'Prod',
                origin,
                fingerprint: fingerprintOf({ name: 'Prod', variables: ['baseUrl'] }),
            },
        ]);
    });

    it('lists the workspace file only while it holds an auth, with the origin that wrote it', async () => {
        const origin = { kind: 'openapi' as const, sourceId: 'shop' };
        const auth = { type: 'bearer' as const, token: '{{token}}' };

        await writeImportedWorkspace(root, 'pasarela', { auth }, origin);

        expect(await existingResourcesOf(root, 'pasarela')).toEqual([
            {
                place: 'workspace',
                route: '.',
                name: 'Pasarela',
                origin,
                fingerprint: fingerprintOf({ auth }),
            },
        ]);
    });

    it('does not list a workspace file that holds only variables', async () => {
        await writeOldWorkspaceVariables(root, 'pasarela', [
            { name: 'host', value: 'a', enabled: true, secret: false },
        ]);

        expect(await existingResourcesOf(root, 'pasarela')).toEqual([]);
    });

    it('keeps the fingerprint of an import when a variable is added by hand afterwards', async () => {
        const origin = { kind: 'postman' as const, sourceId: 'c1' };
        const auth = { type: 'bearer' as const, token: '{{token}}' };

        await writeImportedWorkspace(root, 'pasarela', { auth }, origin);

        const [before] = await existingResourcesOf(root, 'pasarela');

        await writeOldWorkspaceVariables(root, 'pasarela', [
            { name: 'host', value: 'a', enabled: true, secret: false },
        ]);

        const [after] = await existingResourcesOf(root, 'pasarela');

        expect(after?.fingerprint).toBe(before?.fingerprint);
    });
});
