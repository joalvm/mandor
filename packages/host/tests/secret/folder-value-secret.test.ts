import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import { createWorkspace, writeEnvironment, writeRepoTree } from '@mandor/store-fs';
import { REDACTED, redact, resolveText } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environmentScope, variableScopeOf } from '../../src/environment/environment-scope.js';
import { forgetSessionSecrets, sessionSecrets } from '../../src/secret/session-secrets.js';

/** Long enough to be hidden, and shaped like what a user pastes into a token field. */
const VALUE = 'tok_9f4c2ae7';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-folder-secret-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [{ name: 'token', value: '', enabled: true, secret: true }],
        }),
    );

    const folder = join(root, 'workspaces', 'payments', 'collections', 'pedidos', 'altas');

    await mkdir(folder, { recursive: true });
    await writeFile(
        join(folder, 'folder.yaml'),
        'name: Altas\nvariables:\n  - name: auth\n    value: "Bearer {{token}}"\n    enabled: true\n    secret: false\n',
        'utf8',
    );
});

afterEach(async () => {
    forgetSessionSecrets();

    await rm(root, { recursive: true, force: true });
});

describe('a folder value that names a secret of the environment', () => {
    it('resolves to the secret, marks it secret and stays hidden wherever it is shown', async () => {
        const place = { root, repo: 'demo', readSecret: () => Promise.resolve(VALUE) };
        const scope = await environmentScope(place, 'payments', 'local', 'pedidos/altas');
        const resolved = resolveText('{{auth}}', variableScopeOf(scope));

        expect(resolved.text).toBe(`Bearer ${VALUE}`);
        expect(resolved.used).toContainEqual({ name: 'token', level: 'environment', secret: true });
        expect(redact(`Authorization: ${resolved.text}`, sessionSecrets())).toBe(
            `Authorization: Bearer ${REDACTED}`,
        );
    });
});
