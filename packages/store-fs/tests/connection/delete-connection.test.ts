import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createConnection,
    createWorkspace,
    deleteConnection,
    writeRepoTree,
    listConnections,
} from '../../src/index.js';

let root: string;
let path: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
    path = join(root, 'workspaces', 'eventos-de-pagos', 'connections', 'gateway-local.yaml');

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await createConnection(root, 'eventos-de-pagos', {
        id: 'gateway-local',
        name: 'Gateway local',
        url: 'ws://localhost:8080',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('deleting a connection', () => {
    it('takes the file off the disk and the connection out of the list', async () => {
        await deleteConnection(root, 'eventos-de-pagos', 'gateway-local');

        await expect(access(path)).rejects.toThrow();
        expect((await listConnections(root, 'eventos-de-pagos')).connections).toEqual([]);
    });

    /** Deleting what is not there is a mistake worth hearing about, not a silent success. */
    it('reports a connection that is not there', async () => {
        await expect(deleteConnection(root, 'eventos-de-pagos', 'no-existe')).rejects.toThrow();
    });

    it('refuses an id that would climb out of the workspace', async () => {
        await expect(
            deleteConnection(root, 'eventos-de-pagos', '../../gateway-local'),
        ).rejects.toThrow();
    });
});
