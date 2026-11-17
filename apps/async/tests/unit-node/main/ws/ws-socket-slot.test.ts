import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { closeRepo, openRepo, spyIpc, spyWindow, type IpcSpy } from '@mandor/host/testing';
import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { createWorkspace, writeEnvironment, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { waitFor } from '../../../../../../packages/transport-async/tests/support/wait-for.js';
import type { SocketManager, SocketSendRequest } from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

// The slot of a connection in main: whose socket it holds, as opens, closes and sends cross.

type Gate = { promise: Promise<void>; open: () => void; fail: (error: Error) => void };

function gate(): Gate {
    let open!: () => void;
    let fail!: (error: Error) => void;
    const promise = new Promise<void>((resolve, reject) => {
        open = resolve;
        fail = reject;
    });

    return { promise, open, fail };
}

let ipc: IpcSpy;
let dispose: () => void;
let root: string;
let sent: SocketSendRequest[];
let opens: Gate[];
let closes: Gate[];
let secret: Gate | undefined;

function manager(): SocketManager {
    return {
        open: () => opens.shift()?.promise ?? Promise.resolve(),
        close: () => closes.shift()?.promise ?? Promise.resolve(),
        send: (request) => {
            sent.push(request);

            return Promise.resolve();
        },
        retryNow: () => Promise.resolve(),
        disposeAll: () => undefined,
    };
}

/** An open against no environment reads no secret, so it never waits on one. */
function open(environmentId: string | null = 'local'): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsOpen, {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId,
        template: { url: 'wss://echo.example/socket' },
    }) as Promise<Result<Empty>>;
}

function send(template = 'hola'): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsSend, {
        connectionId: 'echo',
        workspaceId: 'payments',
        template,
        origin: null,
        itemPath: null,
    }) as Promise<Result<Empty>>;
}

function close(): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsClose, { connectionId: 'echo' }) as Promise<Result<Empty>>;
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-slot-'));
    ipc = spyIpc();
    sent = [];
    opens = [];
    closes = [];
    secret = undefined;
    dispose = registerWsHandlers(ipc, {
        window: spyWindow(),
        assertUrl: (_transport, value) => new URL(value),
        createManager: () => manager(),
        readSecret: async () => {
            await secret?.promise;

            return 'tok';
        },
        networkFor: () => Promise.resolve({ tls: {} }),
    });
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [{ name: 'token', value: '', enabled: true, secret: true }],
        }),
    );
    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();
    await rm(root, { recursive: true, force: true });
});

describe('the slot of a connection', () => {
    it('takes no frame for a socket main does not hold', async () => {
        await expect(send()).resolves.toMatchObject({
            ok: false,
            error: { code: 'ws-send-failed' },
        });
        expect(sent).toEqual([]);
    });

    it('keeps the socket of an open that came while the close was on its way', async () => {
        await open();

        const closing = gate();

        closes.push(closing);

        const closed = close();

        await open();
        closing.open();
        await closed;

        await expect(send()).resolves.toEqual({ ok: true, value: {} });
        expect(sent).toHaveLength(1);
    });

    it('keeps the socket that took the slot when an earlier open fails', async () => {
        const failing = gate();

        opens.push(failing);

        const first = open();

        // The first open has to reach the port before the second: the gate is the first one's.
        await waitFor(() => {
            expect(opens).toHaveLength(0);
        });
        await expect(open()).resolves.toEqual({ ok: true, value: {} });
        failing.fail(new Error('refused'));
        await expect(first).resolves.toMatchObject({ ok: false });

        await expect(send()).resolves.toEqual({ ok: true, value: {} });
    });

    /** A frame resolved with the secrets of one socket never falls into the one after it. */
    it('drops a frame whose socket was replaced while it resolved', async () => {
        await open();
        secret = gate();

        const sending = send('{{token}}');

        await open(null);
        secret.open();

        await expect(sending).resolves.toMatchObject({
            ok: false,
            error: { code: 'ws-send-failed' },
        });
        expect(sent).toEqual([]);
    });
});
