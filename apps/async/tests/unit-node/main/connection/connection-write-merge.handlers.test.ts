import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { flushAllCommits } from '@mandor/host';
import { closeRepo, openRepo, silentReporting, spyIpc, type IpcSpy } from '@mandor/host/testing';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { listConflicts } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConnectionHandlers } from '../../../../src/main/connection/connection.handlers.js';
import { connectionRepo } from './support/connection-repo.js';

const WORKSPACE = { workspaceId: 'api-de-pagos' };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let file: string;
let ecoId: string;

const freshRepo = connectionRepo();

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerConnectionHandlers(ipc, silentReporting());

    openRepo(root);

    const created = (await ipc.call(CHANNELS.connectionCreate, {
        ...WORKSPACE,
        name: 'Eco',
        url: 'wss://echo.example/socket',
    })) as Result<Connection>;

    if (!created.ok) {
        throw new Error('the connection was not created');
    }

    ecoId = created.value.id;
    file = join(root, 'workspaces', 'api-de-pagos', 'connections', `${ecoId}.yaml`);

    await ipc.call(CHANNELS.connectionList, WORKSPACE);
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    closeRepo();

    await rm(root, { recursive: true, force: true });
});

function update(changes: unknown): Promise<unknown> {
    return ipc.call(CHANNELS.connectionUpdate, { ...WORKSPACE, connectionId: ecoId, changes });
}

describe('updating a connection the window listed before the file changed', () => {
    it('keeps their change in a key the window did not touch', async () => {
        await writeFile(file, `${await readFile(file, 'utf8')}other-app: 1\n`);

        await update({ description: 'La mia' });

        const written = await readFile(file, 'utf8');

        expect(written).toContain('other-app: 1');
        expect(written).toContain('La mia');
        expect((await listConflicts(root)).conflicts).toEqual([]);
    });

    it('keeps the window version and records the clash on the same field', async () => {
        const text = await readFile(file, 'utf8');

        await writeFile(file, text.replace('wss://echo.example/socket', 'wss://ellos.example'));

        await update({ url: 'wss://mio.example' });

        const { conflicts } = await listConflicts(root);

        expect(await readFile(file, 'utf8')).toContain('url: wss://mio.example');
        expect(conflicts).toHaveLength(1);
    });
});
