import { rm } from 'node:fs/promises';

import { status } from '@mandor/git';
import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConnectionHandlers } from '../../../../src/main/connection/connection.handlers.js';
import { connectionRepo } from './support/connection-repo.js';
import { closeRepo, type IpcSpy, openRepo, silentReporting, spyIpc } from '@mandor/host/testing';

const WORKSPACE = { workspaceId: 'api-de-pagos' };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let ecoId: string;

const freshRepo = connectionRepo();

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerConnectionHandlers(ipc, silentReporting());

    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();

    await rm(root, { recursive: true, force: true });
});

function create(payload: unknown): Promise<Result<Connection>> {
    return ipc.call(CHANNELS.connectionCreate, payload) as Promise<Result<Connection>>;
}

function list(payload: unknown): Promise<Result<Connection[]>> {
    return ipc.call(CHANNELS.connectionList, payload) as Promise<Result<Connection[]>>;
}

function remove(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.connectionDelete, payload) as Promise<Result<Empty>>;
}

describe('deleting a connection from the renderer', () => {
    beforeEach(async () => {
        const created = await create({
            ...WORKSPACE,
            name: 'Eco',
            url: 'wss://echo.example/socket',
        });

        if (!created.ok) {
            throw new Error('the connection was not created');
        }

        ecoId = created.value.id;
    });

    it('takes the connection out of the workspace', async () => {
        await expect(remove({ ...WORKSPACE, connectionId: ecoId })).resolves.toEqual({
            ok: true,
            value: {},
        });

        await expect(list(WORKSPACE)).resolves.toEqual({ ok: true, value: [] });
    });

    it('leaves nothing pending behind it', async () => {
        await remove({ ...WORKSPACE, connectionId: ecoId });

        await expect(status(root)).resolves.toMatchObject({ clean: true });
    });

    it('answers a connection that is not there with a read failure', async () => {
        await expect(remove({ ...WORKSPACE, connectionId: 'nadie' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'fs-read' },
        });
    });

    it('refuses an id that is not one path segment', async () => {
        await expect(remove({ ...WORKSPACE, connectionId: '../escape' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
