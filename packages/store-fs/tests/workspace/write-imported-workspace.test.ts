import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, writeRepoTree, readWorkspace } from '../../src/index.js';
import { writeImportedWorkspace } from '../../src/workspace/write-imported-workspace.js';

const NOTHING = { auth: null, importedScripts: null } as const;
const SCRIPT = { event: 'onBeforeRequest', dialect: 'postman', source: 'a()' } as const;
const ORIGIN = { kind: 'openapi', sourceId: 'abc', fingerprint: 'f1' } as const;

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'sync' });
    await writeFile(
        workspaceFile(),
        '# the workspace of the payments\nname: API de pagos\nkind: sync\nid: api-de-pagos\n',
        'utf8',
    );
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function workspaceFile(): string {
    return join(root, 'workspaces', 'api-de-pagos', 'workspace.yaml');
}

describe('writeImportedWorkspace', () => {
    it('writes the auth and the origin in one write, keeping the comments of the file', async () => {
        await writeImportedWorkspace(
            root,
            'api-de-pagos',
            { ...NOTHING, auth: { type: 'bearer', token: '{{token}}' } },
            ORIGIN,
        );

        const written = await readFile(workspaceFile(), 'utf8');
        const read = await readWorkspace(root, 'api-de-pagos');

        expect(written).toContain('# the workspace of the payments');
        expect(read.ok && read.value.auth).toEqual({ type: 'bearer', token: '{{token}}' });
        expect(read.ok && read.value.importOrigin).toEqual(ORIGIN);
    });

    it('takes both keys out when the import no longer carries the auth', async () => {
        await writeImportedWorkspace(
            root,
            'api-de-pagos',
            { ...NOTHING, auth: { type: 'bearer', token: 't' } },
            ORIGIN,
        );
        await writeImportedWorkspace(root, 'api-de-pagos', NOTHING, null);

        const written = await readFile(workspaceFile(), 'utf8');

        expect(written).not.toContain('auth');
        expect(written).not.toContain('importOrigin');
        expect(written).toContain('# the workspace of the payments');
    });

    it('refuses a workspace file it cannot read, instead of starting one', async () => {
        await rm(workspaceFile());

        await expect(writeImportedWorkspace(root, 'api-de-pagos', NOTHING, null)).rejects.toThrow(
            /workspace/,
        );
    });

    it('writes the scripts with the origin and takes them out when none come', async () => {
        const withScript = { ...NOTHING, importedScripts: [SCRIPT] };

        await writeImportedWorkspace(root, 'api-de-pagos', withScript, ORIGIN);

        const read = await readWorkspace(root, 'api-de-pagos');

        expect(read.ok && read.value.importedScripts).toEqual([SCRIPT]);

        await writeImportedWorkspace(
            root,
            'api-de-pagos',
            { ...NOTHING, importedScripts: [] },
            null,
        );

        expect(await readFile(workspaceFile(), 'utf8')).not.toContain('importedScripts');
    });
});
