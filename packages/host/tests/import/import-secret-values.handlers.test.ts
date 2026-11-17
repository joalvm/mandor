import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ImportResource } from '@mandor/interop-core';
import { CHANNELS, type ImportApplied, type ImportPlanBuilt, type Result } from '@mandor/ipc';
import { globalsSecretKey } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerImportHandlers } from '../../src/import/import.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { clearSecret, readSecret } from '../../src/origin/secret-store.js';
import { environmentSecretKey } from '../../src/secret/environment-secret-key.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { fixtureFormat, fixtureText } from '../interop/fixture-format.js';
import { importRepo } from './support/import-workspace.js';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

const repo = importRepo();
const ORIGIN = { kind: 'postman', sourceId: 'doc' } as const;
const PLACE = { repo: 'local', workspaceId: 'pasarela', environmentId: 'prod' };

let root: string;
let userDataDir: string;
let ipc: IpcSpy;
let dispose: () => void;
let resources: ImportResource[];

function variable(name: string, value: string, secret = true) {
    return { name, value, enabled: true, secret };
}

function environment(variables: readonly unknown[]): ImportResource {
    return {
        place: 'environment',
        itemKind: null,
        route: 'prod',
        name: 'Prod',
        fields: { name: 'Prod', variables },
        origin: ORIGIN,
        degradations: [],
    };
}

function globals(variables: readonly unknown[]): ImportResource {
    return { ...environment(variables), place: 'globals', route: 'globals', name: 'Globals' };
}

async function built(): Promise<ImportPlanBuilt> {
    const answer = (await ipc.call(CHANNELS.importPlanBuild, {
        workspaceId: 'pasarela',
        files: [{ path: 'pasarela.json', text: fixtureText('pasarela-3') }],
        scope: 'workspace',
    })) as Result<ImportPlanBuilt>;

    if (!answer.ok) {
        throw new Error('the document should build a plan');
    }

    return answer.value;
}

async function apply(plan: ImportPlanBuilt['plan']): Promise<Result<ImportApplied>> {
    return (await ipc.call(CHANNELS.importApply, {
        target: { workspaceId: 'pasarela' },
        name: 'Doc',
        plan,
    })) as Result<ImportApplied>;
}

function kept(name: string): Promise<string | null> {
    return readSecret(userDataDir, environmentSecretKey(PLACE, name));
}

function environmentFileText(): Promise<string> {
    return readFile(join(root, 'workspaces/pasarela/environments/prod.yaml'), 'utf8');
}

beforeEach(async () => {
    root = await repo();
    userDataDir = await mkdtemp(join(tmpdir(), 'import-secret-values-'));
    ipc = spyIpc();
    resources = [];
    dispose = registerImportHandlers(ipc, {
        chooseDocument: () => Promise.resolve(null),
        formats: [fixtureFormat],
        readImport: () => Promise.resolve({ name: 'Doc', resources }),
        stores: ['message', 'connection'],
        folderSettings: [],
        kind: 'async',
        userDataDir,
        target: { isDestroyed: () => true, webContents: { send: () => undefined } },
    });
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);
    await clearSecret(userDataDir, environmentSecretKey(PLACE, 'token'));
    await clearSecret(userDataDir, environmentSecretKey(PLACE, 'other'));
    await clearSecret(userDataDir, globalsSecretKey('local', 'token'));
    await rm(root, { recursive: true, force: true });
    await rm(userDataDir, { recursive: true, force: true });
});

describe('a secret variable of an imported document', () => {
    it('does not cross to the window in the plan', async () => {
        resources = [environment([variable('token', 'shh-value')])];

        expect(JSON.stringify(await built())).not.toContain('shh-value');
    });

    it('keeps its value in the store and writes the file without it', async () => {
        resources = [
            environment([variable('token', 'shh-value'), variable('base', 'plain', false)]),
        ];

        const applied = await apply((await built()).plan);

        expect(applied.ok && applied.value.applied).toBe(1);
        expect(await kept('token')).toBe('shh-value');
        expect(await environmentFileText()).not.toContain('shh-value');
        expect(await environmentFileText()).toContain('plain');
    });

    it('lets a second import add a name and leaves the value already kept', async () => {
        resources = [environment([variable('token', 'shh-value')])];
        await apply((await built()).plan);

        resources = [
            environment([variable('token', 'another-value'), variable('other', 'new-value')]),
        ];
        await apply((await built()).plan);

        expect(await kept('token')).toBe('shh-value');
        expect(await kept('other')).toBe('new-value');
    });

    it('keeps nothing when the person leaves the environment out', async () => {
        resources = [environment([variable('token', 'shh-value')])];

        const { plan } = await built();

        await apply({
            ...plan,
            entries: plan.entries.map((entry) => ({ ...entry, selected: false })),
        });

        expect(await kept('token')).toBeNull();
    });

    it('keeps a value of the globals, under the key of the globals', async () => {
        resources = [globals([variable('token', 'shh-value')])];

        await apply((await built()).plan);

        expect(await readSecret(userDataDir, globalsSecretKey('local', 'token'))).toBe('shh-value');
    });
});
