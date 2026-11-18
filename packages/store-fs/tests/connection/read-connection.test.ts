import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createConnection,
    createWorkspace,
    FileReadError,
    writeRepoTree,
    readConnection,
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

describe('reading a connection', () => {
    it('returns the connection stored in its file', async () => {
        const made = await createConnection(root, 'eventos-de-pagos', {
            id: 'gateway-local',
            name: 'Gateway local',
            url: 'ws://localhost:8080',
        });

        expect(await readConnection(root, 'eventos-de-pagos', made.id)).toEqual(made);
    });

    it('reports a connection that is not there', async () => {
        await expect(readConnection(root, 'eventos-de-pagos', 'no-existe')).rejects.toThrow(
            FileReadError,
        );
    });
});
