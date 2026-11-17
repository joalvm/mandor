import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { connectionIds } from '../../src/connection/connection-ids.js';
import {
    createConnection,
    createWorkspace,
    NameTakenError,
    writeRepoTree,
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

describe('creating a connection', () => {
    it('writes one file per connection inside its workspace', async () => {
        const connection = await createConnection(root, 'eventos-de-pagos', {
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'ws://localhost:8080',
        });
        const path = join(
            root,
            'workspaces',
            'eventos-de-pagos',
            'connections',
            'gateway-local.yaml',
        );

        expect(connection.id).toBe('gateway-local');
        expect(await readFile(path, 'utf8')).toContain('url: ws://localhost:8080');
    });

    it('keeps two connections of the same name apart by their ids', async () => {
        await createConnection(root, 'eventos-de-pagos', {
            id: 'aaaaaaaaaaaa',
            name: 'Gateway',
            url: 'ws://localhost:8080',
        });
        await createConnection(root, 'eventos-de-pagos', {
            id: 'bbbbbbbbbbbb',
            name: 'Gateway',
            url: 'wss://gateway.example.com',
        });

        expect(await connectionIds(root, 'eventos-de-pagos')).toEqual([
            'aaaaaaaaaaaa',
            'bbbbbbbbbbbb',
        ]);
    });

    it('refuses an id that is already a connection, and leaves the file as it was', async () => {
        const first = { id: 'gateway', name: 'Gateway', url: 'ws://localhost:8080' };

        await createConnection(root, 'eventos-de-pagos', first);

        await expect(
            createConnection(root, 'eventos-de-pagos', {
                ...first,
                url: 'wss://other.example.com',
            }),
        ).rejects.toBeInstanceOf(NameTakenError);

        const path = join(root, 'workspaces', 'eventos-de-pagos', 'connections', 'gateway.yaml');

        expect(await readFile(path, 'utf8')).toContain('url: ws://localhost:8080');
    });

    /** Only `ws:` and `wss:` ever reach the socket; the guard starts at the file. */
    it('refuses a url the domain does not accept', async () => {
        await expect(
            createConnection(root, 'eventos-de-pagos', {
                id: 'gateway',
                name: 'Gateway',
                url: 'http://localhost:8080',
            }),
        ).rejects.toThrow();
    });
});
