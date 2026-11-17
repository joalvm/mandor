import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeGlobals, writeRepoTree } from '@mandor/store-fs';
import { globalsSecretKey, REDACTED, redact, resolveText } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environmentScope, variableScopeOf } from '../../src/environment/environment-scope.js';
import { redactedIpc } from '../../src/ipc/redacted-ipc.js';
import { forgetSessionSecrets, sessionSecrets } from '../../src/secret/session-secrets.js';
import { spyIpc } from '../../src/testing/handler-harness.js';

/** Long enough to be hidden, and shaped like what a user pastes into a token field. */
const VALUE = 'tok_9f4c2ae7';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-global-secret-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeGlobals(root, {
        variables: [{ name: 'token', value: '', enabled: true, secret: true }],
    });
});

afterEach(async () => {
    forgetSessionSecrets();

    await rm(root, { recursive: true, force: true });
});

async function resolvedWithTheGlobal(): Promise<string> {
    const place = {
        root,
        repo: 'repo-1',
        readSecret: (key: string) =>
            Promise.resolve(key === globalsSecretKey('repo-1', 'token') ? VALUE : null),
    };
    const scope = await environmentScope(place, 'payments', null, null);

    return resolveText('Bearer {{token}}', variableScopeOf(scope)).text;
}

describe('a secret of the globals', () => {
    it('reaches what goes out, and is hidden wherever a resolution is shown', async () => {
        const sent = await resolvedWithTheGlobal();

        expect(sent).toBe(`Bearer ${VALUE}`);
        expect(redact(`activity: ${sent}`, sessionSecrets())).toBe(`activity: Bearer ${REDACTED}`);
    });

    it('never crosses the bridge in an answer of main', async () => {
        const sent = await resolvedWithTheGlobal();
        const ipc = spyIpc();

        redactedIpc(ipc).handle('history:list', () => Promise.resolve({ ok: true, value: [sent] }));

        await expect(ipc.call('history:list', {})).resolves.toEqual({
            ok: true,
            value: [`Bearer ${REDACTED}`],
        });
    });
});
