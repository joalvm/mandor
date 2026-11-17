import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { REPO_FORMAT } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createConnection,
    createWorkspace,
    writeRepoTree,
    listConnections,
    loadRepo,
} from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('initialising a repo', () => {
    it('writes the repo file at the current format version', async () => {
        const repo = await writeRepoTree(root, 'Mi repo');

        expect(repo).toEqual({ formatVersion: REPO_FORMAT, name: 'Mi repo', workspaces: [] });
        expect(await readFile(join(root, 'mandor.yaml'), 'utf8')).toContain('name: Mi repo');
    });

    it('creates the workspaces container and the private directory', async () => {
        await writeRepoTree(root, 'Mi repo');

        expect((await readdir(root)).toSorted()).toEqual([
            '.gitattributes',
            '.gitignore',
            '.mandor',
            'mandor.yaml',
            'workspaces',
        ]);
    });

    /** Secrets and session state live in `.mandor/`; committing them would publish them. */
    it('keeps the private directory out of git from the first commit', async () => {
        await writeRepoTree(root, 'Mi repo');

        expect(await readFile(join(root, '.gitignore'), 'utf8')).toContain('.mandor/');
    });

    /** Without `eol=lf` every file the other platform touches comes back as a whole-file diff. */
    it('pins the line ending for the whole repo', async () => {
        await writeRepoTree(root, 'Mi repo');

        expect(await readFile(join(root, '.gitattributes'), 'utf8')).toContain(
            '* text=auto eol=lf',
        );
    });
});

/** The path the app walks on first run. What comes back must be what went in, order included. */
describe('a repo built from scratch', () => {
    it('reloads exactly what was written', async () => {
        await writeRepoTree(root, 'Mi repo');
        await createWorkspace(root, {
            id: 'eventos-de-pagos',
            name: 'Eventos de pagos',
            kind: 'async',
        });

        const second = await createWorkspace(root, {
            id: 'api-de-pagos',
            name: 'Api de pagos',
            kind: 'sync',
        });

        await createConnection(root, 'eventos-de-pagos', {
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'ws://localhost:8080',
        });

        const loaded = await loadRepo(root);
        const listed = await listConnections(root, 'eventos-de-pagos');

        expect(loaded.warnings).toEqual([]);
        expect(loaded.repo?.workspaces).toEqual(['eventos-de-pagos', 'api-de-pagos']);
        expect(loaded.workspaces.map((workspace) => workspace.name)).toEqual([
            'Eventos de pagos',
            'Api de pagos',
        ]);
        expect(second.kind).toBe('sync');
        expect(listed.connections).toEqual([
            {
                id: 'gateway-local',
                name: 'Gateway local',
                transport: 'websocket',
                url: 'ws://localhost:8080',
                headers: [],
                environmentId: null,
            },
        ]);
    });
});
