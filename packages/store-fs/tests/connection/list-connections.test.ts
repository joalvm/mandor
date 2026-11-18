import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createConnection,
    createWorkspace,
    writeRepoTree,
    listConnections,
} from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function connectionsPath(): string {
    return join(root, 'workspaces', 'eventos-de-pagos', 'connections');
}

describe('listing connections', () => {
    it('returns them sorted by name, whatever their ids', async () => {
        await createConnection(root, 'eventos-de-pagos', {
            id: 'aaa',
            name: 'Zeta',
            url: 'ws://localhost:1',
        });
        await createConnection(root, 'eventos-de-pagos', {
            id: 'zzz',
            name: 'Alfa',
            url: 'ws://localhost:2',
        });

        const listed = await listConnections(root, 'eventos-de-pagos');

        expect(listed.connections.map((connection) => connection.name)).toEqual(['Alfa', 'Zeta']);
    });

    it('returns nothing when the workspace has no connections yet', async () => {
        const listed = await listConnections(root, 'eventos-de-pagos');

        expect(listed).toEqual({ connections: [], warnings: [] });
    });

    it('ignores files that are not YAML documents of a connection', async () => {
        await mkdir(connectionsPath(), { recursive: true });
        await writeFile(join(connectionsPath(), 'notas.md'), '# nada\n', 'utf8');
        await createConnection(root, 'eventos-de-pagos', {
            id: 'alfa',
            name: 'Alfa',
            url: 'ws://localhost:2',
        });

        const listed = await listConnections(root, 'eventos-de-pagos');

        expect(listed.connections.map((connection) => connection.id)).toEqual(['alfa']);
        expect(listed.warnings).toEqual([]);
    });

    it('turns a broken connection file into a warning', async () => {
        await mkdir(connectionsPath(), { recursive: true });
        await writeFile(join(connectionsPath(), 'rota.yaml'), 'id: [rota\n', 'utf8');

        const listed = await listConnections(root, 'eventos-de-pagos');

        expect(listed.connections).toEqual([]);
        expect(listed.warnings).toHaveLength(1);
    });
});
