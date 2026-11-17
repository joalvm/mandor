import { rm } from 'node:fs/promises';

import { status } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConnectionHandlers } from '../../../../src/main/connection/connection.handlers.js';
import { connectionRepo } from './support/connection-repo.js';
import { closeRepo, type IpcSpy, openRepo, silentReporting, spyIpc } from '@mandor/host/testing';

const WORKSPACE = { workspaceId: 'api-de-pagos' };

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

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

describe('creating a connection from the renderer', () => {
    it('answers with the connection it wrote', async () => {
        await expect(
            create({ ...WORKSPACE, name: 'Eco', url: 'wss://echo.example/socket' }),
        ).resolves.toEqual({
            ok: true,
            value: {
                id: expect.stringMatching(/^[0-9a-hjkmnp-tv-z]{12}$/) as string,
                name: 'Eco',
                transport: 'websocket',
                url: 'wss://echo.example/socket',
                headers: [],
                environmentId: null,
            },
        });
    });

    /** Every write ends in a commit, or the work of the user lives only in the working tree. */
    it('leaves nothing pending behind it', async () => {
        await create({ ...WORKSPACE, name: 'Eco', url: 'wss://echo.example/socket' });

        await expect(status(root)).resolves.toMatchObject({ clean: true });
    });

    /** The scheme is decided at the border of main, not by the form that sent it. */
    it('refuses a url that is not a websocket', async () => {
        await expect(
            create({ ...WORKSPACE, name: 'Eco', url: 'http://echo.example/socket' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('writes a socket.io connection that dials http', async () => {
        await expect(
            create({
                ...WORKSPACE,
                name: 'Eco',
                url: 'http://echo.example',
                transport: 'socketio',
            }),
        ).resolves.toMatchObject({ ok: true, value: { transport: 'socketio' } });

        await expect(list(WORKSPACE)).resolves.toMatchObject({
            ok: true,
            value: [{ transport: 'socketio', url: 'http://echo.example' }],
        });
    });

    it('refuses a socket.io connection whose url is a websocket url', async () => {
        await expect(
            create({ ...WORKSPACE, name: 'Eco', url: 'ws://echo.example', transport: 'socketio' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses a workspace id that is not one path segment', async () => {
        await expect(
            create({ workspaceId: '../escape', name: 'Eco', url: 'wss://echo.example' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});

describe('listing the connections from the renderer', () => {
    it('knows none in a workspace nobody wrote to', async () => {
        await expect(list(WORKSPACE)).resolves.toEqual({ ok: true, value: [] });
    });

    it('gives back what the workspace holds', async () => {
        const created = await create({
            ...WORKSPACE,
            name: 'Eco',
            url: 'wss://echo.example/socket',
        });

        await expect(list(WORKSPACE)).resolves.toMatchObject({
            ok: true,
            value: [{ id: created.ok ? created.value.id : '', name: 'Eco' }],
        });
    });

    it('refuses a request without a workspace', async () => {
        await expect(list({})).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('the disposer of the connection handlers', () => {
    it('leaves no channel registered', () => {
        expect(ipc.registered()).toEqual([
            CHANNELS.connectionCreate,
            CHANNELS.connectionList,
            CHANNELS.connectionUpdate,
            CHANNELS.connectionDelete,
        ]);

        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
