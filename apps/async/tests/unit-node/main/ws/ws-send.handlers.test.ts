import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import {
    createWorkspace,
    writeRepoTree,
    writeActiveEnvironments,
    writeEnvironment,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    closeRepo,
    type IpcSpy,
    openRepo,
    spyIpc,
    spyWindow,
    type WindowSpy,
} from '@mandor/host/testing';
import type {
    SocketManager,
    SocketManagerEvents,
    SocketSendRequest,
} from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

let ipc: IpcSpy;
let window: WindowSpy;
let events: SocketManagerEvents;
let dispose: () => void;
let sent: SocketSendRequest[];
let live: Set<string>;
let root: string;

function manager(): SocketManager {
    return {
        close: () => Promise.resolve(),
        disposeAll: () => undefined,
        open: (request) => {
            live.add(request.connectionId);

            return Promise.resolve();
        },
        retryNow: () => Promise.resolve(),
        send: (request) => {
            if (!live.has(request.connectionId)) {
                return Promise.reject(new Error('socket is not open'));
            }

            sent.push(request);

            return Promise.resolve();
        },
    };
}

function open(environmentId: string | null): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsOpen, {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId,
        template: { url: 'wss://echo.example/socket' },
    }) as Promise<Result<Empty>>;
}

function send(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsSend, payload) as Promise<Result<Empty>>;
}

function frame(): Record<string, unknown> {
    return {
        connectionId: 'echo',
        workspaceId: 'payments',
        template: '{ "id": "{{pedidoId}}", "clave": "{{token}}" }',
        origin: 'Pedido creado',
        itemPath: null,
    };
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-send-'));
    ipc = spyIpc();
    window = spyWindow();
    sent = [];
    live = new Set();
    dispose = registerWsHandlers(ipc, {
        window,
        readSecret: () => Promise.resolve('un-secreto-muy-largo'),
        networkFor: () => Promise.resolve({ tls: {} }),
        assertUrl: (_transport, value) => new URL(value),
        createManager: (given) => {
            events = given;

            return manager();
        },
    });
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'pedidoId', value: 'p-1', enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
            ],
        }),
    );
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'staging',
            name: 'Staging',
            variables: [{ name: 'pedidoId', value: 'p-99', enabled: true, secret: false }],
        }),
    );
    await writeActiveEnvironments(root, { payments: 'local' });
    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();
    await rm(root, { recursive: true, force: true });
});

describe('sending a frame from the renderer', () => {
    /** The renderer hands over a template; the values are read here and nowhere else. */
    it('resolves the template in main and hands the frame to the port', async () => {
        await open('local');
        await expect(send(frame())).resolves.toEqual({ ok: true, value: {} });

        expect(sent).toEqual([
            {
                connectionId: 'echo',
                data: '{ "id": "p-1", "clave": "un-secreto-muy-largo" }',
                origin: 'Pedido creado',
            },
        ]);
    });

    /**
     * The socket resolves against the environment it was opened with, which is the one the
     * timeline is stamped with. Working it out again could name one and use another.
     */
    it('uses the environment the socket was opened with', async () => {
        await open('staging');
        await send(frame());

        expect(sent[0]?.data).toContain('p-99');
    });

    it('answers every refused send with the code of its own channel', async () => {
        await open(null);
        await expect(send({ ...frame(), connectionId: 'otra' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'ws-send-failed' },
        });
        await expect(send({ connectionId: 'echo', data: 'hola' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    /**
     * A secret that built a frame must not come back on the way to the window. That the marker
     * takes its place is `secret-never-leaves.test.ts`; what this one adds is that a frame built
     * here, and echoed back through the timeline, goes through that same border.
     */
    it('never lets the value of a secret reach the window in the timeline', async () => {
        await open('local');
        await send(frame());
        events.onActivity({
            connectionId: 'echo',
            records: [{ direction: 'out', data: sent[0]?.data ?? '', at: 1 }],
        });

        expect(JSON.stringify(window.sent)).not.toContain('un-secreto-muy-largo');
    });
});
