import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportPlanEntry, ImportResource } from '@mandor/interop-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { holdSecrets, type HeldSecrets } from '../../src/import/held-secrets.js';
import { importedSecretsKeeper } from '../../src/import/keep-imported-secrets.js';
import { clearSecret, heldSecretKeys } from '../../src/origin/secret-store.js';

let userDataDir: string;
let held: HeldSecrets;

function resource(place: ImportResource['place']): ImportResource {
    return {
        place,
        itemKind: null,
        route: 'prod',
        name: 'Prod',
        fields: { variables: [{ name: 'token', value: 'shh', enabled: true, secret: true }] },
        origin: { kind: 'postman', sourceId: 'doc' },
        degradations: [],
    };
}

function entryOf(resourceOfEntry: ImportResource | null): ImportPlanEntry {
    return {
        class: 'add',
        place: resourceOfEntry?.place ?? 'environment',
        route: 'prod',
        name: 'Prod',
        resource: resourceOfEntry,
        selected: true,
    };
}

beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'keep-imported-secrets-'));
    held = new Map();
});

afterEach(async () => {
    for (const key of heldSecretKeys(userDataDir)) {
        await clearSecret(userDataDir, key);
    }

    await rm(userDataDir, { recursive: true, force: true });
});

describe('importedSecretsKeeper', () => {
    it('keeps nothing of an entry with no values held', async () => {
        const keep = importedSecretsKeeper(held, {
            userDataDir,
            root: userDataDir,
            repo: 'local',
            workspaceId: 'w',
        });

        await keep(entryOf(null));
        await keep(entryOf(resource('environment')));

        expect(heldSecretKeys(userDataDir)).toEqual([]);
    });

    it('keeps nothing of a place that holds no secrets of its own', async () => {
        const [connection] = holdSecrets([resource('connection')], held);
        const keep = importedSecretsKeeper(held, {
            userDataDir,
            root: userDataDir,
            repo: 'local',
            workspaceId: 'w',
        });

        await keep(entryOf(connection ?? null));

        expect(heldSecretKeys(userDataDir)).toEqual([]);
    });
});
