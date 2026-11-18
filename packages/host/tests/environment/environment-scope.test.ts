import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment, writeGlobals } from '@mandor/store-fs';
import { globalsSecretKey, resolveTemplates } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    environmentScope,
    type EnvironmentPlace,
    variableScopeOf,
} from '../../src/environment/environment-scope.js';
import { environmentSecretKey } from '../../src/secret/environment-secret-key.js';
import { sessionSecrets } from '../../src/secret/session-secrets.js';

let root: string;
let place: EnvironmentPlace;

function placeKeeping(kept: Record<string, string>): EnvironmentPlace {
    return {
        root,
        repo: 'repo-1',
        readSecret: (key) => Promise.resolve(kept[key] ?? null),
    };
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-env-scope-'));
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'staging',
            name: 'Staging',
            variables: [
                { name: 'host', value: 'api.test', enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
                { name: 'off', value: 'x', enabled: false, secret: false },
            ],
        }),
    );
    place = placeKeeping({
        [environmentSecretKey(
            { repo: 'repo-1', workspaceId: 'payments', environmentId: 'staging' },
            'token',
        )]: 's3cret-value',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('environmentScope', () => {
    it('is empty when no environment was chosen', async () => {
        await expect(environmentScope(place, 'payments', null, null)).resolves.toEqual({
            environment: null,
            values: {},
            secrets: {},
            globals: { values: {}, secrets: {} },
            chain: [expect.objectContaining({ level: 'workspace' })],
        });
    });

    it('gathers the plain values of the file and the secrets of the keychain apart', async () => {
        const scope = await environmentScope(place, 'payments', 'staging', null);

        expect(scope.environment?.name).toBe('Staging');
        expect(scope.values).toEqual({ host: 'api.test' });
        expect(scope.secrets).toEqual({ token: 's3cret-value' });
    });

    it('leaves out a secret this machine keeps no value for', async () => {
        const scope = await environmentScope(placeKeeping({}), 'payments', 'staging', null);

        expect(scope.secrets).toEqual({});
        expect(scope.values).not.toHaveProperty('token');
    });

    it('does not fail when the keyring throws: the variable stays empty', async () => {
        const broken: EnvironmentPlace = {
            ...place,
            readSecret: () => Promise.reject(new Error('locked')),
        };

        await expect(environmentScope(broken, 'payments', 'staging', null)).resolves.toMatchObject({
            secrets: {},
        });
    });

    it('gathers the enabled globals apart from the environment, the secret ones kept here', async () => {
        await writeGlobals(root, {
            variables: [
                { name: 'host', value: 'global.test', enabled: true, secret: false },
                { name: 'region', value: 'eu', enabled: true, secret: false },
                { name: 'off', value: 'x', enabled: false, secret: false },
                { name: 'key', value: '', enabled: true, secret: true },
            ],
        });

        const kept = placeKeeping({ [globalsSecretKey('repo-1', 'key')]: 'global-secret' });
        const scope = await environmentScope(kept, 'payments', 'staging', null);

        expect(scope.globals).toEqual({
            values: { host: 'global.test', region: 'eu' },
            secrets: { key: 'global-secret' },
        });
        expect(sessionSecrets()).toContain('global-secret');
    });

    it('reads no globals from an origin that never saved them', async () => {
        const scope = await environmentScope(place, 'payments', null, null);

        expect(scope.globals).toEqual({ values: {}, secrets: {} });
    });
});

describe('the environment that rules with none chosen', () => {
    it('is the default of the workspace', async () => {
        const file = join(root, 'workspaces', 'payments', 'workspace.yaml');

        await writeFile(
            file,
            `${await readFile(file, 'utf8')}defaultEnvironment: staging\n`,
            'utf8',
        );

        const scope = await environmentScope(place, 'payments', null, null);

        expect(scope.environment?.id).toBe('staging');
        expect(scope.values).toEqual({ host: 'api.test' });
        expect(scope.secrets).toEqual({ token: 's3cret-value' });
    });
});

describe('variableScopeOf', () => {
    it('resolves the environment over the globals, a kept value as a secret', async () => {
        await writeGlobals(root, {
            variables: [
                { name: 'host', value: 'global.test', enabled: true, secret: false },
                { name: 'region', value: 'eu', enabled: true, secret: false },
            ],
        });

        const scope = variableScopeOf(await environmentScope(place, 'payments', 'staging', null));
        const resolved = resolveTemplates({ url: '{{host}}/{{region}}', auth: '{{token}}' }, scope);

        expect(resolved.values).toEqual({ url: 'api.test/eu', auth: 's3cret-value' });
        expect(resolved.used).toContainEqual({ name: 'token', level: 'environment', secret: true });
        expect(resolved.used).toContainEqual({ name: 'region', level: 'globals', secret: false });
    });
});
