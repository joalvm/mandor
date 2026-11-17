import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { createWorkspace, writeRepoTree, writeActiveEnvironments } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    closeRepo,
    type IpcSpy,
    openRepo,
    spyIpc,
    spyWindow,
    type WindowSpy,
} from '@mandor/host/testing';
import type { SocketManager } from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

let ipc: IpcSpy;
let window: WindowSpy;
let sent: unknown[];
let dispose: () => void;
let root: string;

function open(): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsOpen, {
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: null,
        transport: 'socketio',
        template: { url: 'https://echo.example' },
    }) as Promise<Result<Empty>>;
}

function send(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsSend, payload) as Promise<Result<Empty>>;
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-send-named-'));
    ipc = spyIpc();
    window = spyWindow();
    sent = [];
    dispose = registerWsHandlers(ipc, {
        window,
        readSecret: () => Promise.resolve(null),
        networkFor: () => Promise.resolve({ tls: {} }),
        assertUrl: (_transport, value) => new URL(value),
        createManager: (): SocketManager => ({
            close: () => Promise.resolve(),
            disposeAll: () => undefined,
            open: () => Promise.resolve(),
            retryNow: () => Promise.resolve(),
            send: (_request) => {
                sent.push(_request);

                return Promise.resolve();
            },
        }),
    });
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeActiveEnvironments(root, { payments: 'local' });
    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();
    await rm(root, { recursive: true, force: true });
});

describe('a send over a connection that speaks Socket.IO', () => {
    it('carries the event the renderer named to the port', async () => {
        await open();
        await send({
            connectionId: 'echo',
            workspaceId: 'payments',
            template: 'hola',
            origin: null,
            itemPath: null,
            event: 'chat:message',
        });

        expect(sent[0]).toMatchObject({ data: 'hola', event: 'chat:message' });
    });

    it('refuses an emission that names no event, and sends nothing', async () => {
        await open();
        await expect(
            send({
                connectionId: 'echo',
                workspaceId: 'payments',
                template: 'hola',
                origin: null,
                itemPath: null,
            }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(sent).toEqual([]);
    });
});
