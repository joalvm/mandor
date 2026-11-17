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
    SocketOpenRequest,
} from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

let ipc: IpcSpy;
let window: WindowSpy;
let events: SocketManagerEvents;
let dispose: () => void;
let asserted: string[];
let opened: SocketOpenRequest[];
let root: string;

function openRequest() {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: 'local',
        template: {
            url: 'wss://{{host}}/socket',
            headers: { 'x-target': '{{host}}' },
        },
    };
}

function manager(): SocketManager {
    return {
        close: () => Promise.resolve(),
        disposeAll: () => undefined,
        open: (request) => {
            opened.push(request);

            return Promise.resolve();
        },
        retryNow: () => Promise.resolve(),
        send: () => Promise.resolve(),
    };
}

function call(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.wsOpen, payload) as Promise<Result<Empty>>;
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-open-'));
    ipc = spyIpc();
    window = spyWindow();
    asserted = [];
    opened = [];
    dispose = registerWsHandlers(ipc, {
        window,
        readSecret: () => Promise.resolve(null),
        networkFor: () => Promise.resolve({ tls: {} }),
        assertUrl: (_transport, value) => {
            asserted.push(value);

            return new URL(value);
        },
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
            variables: [{ name: 'host', value: 'echo.example', enabled: true, secret: false }],
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

describe('opening a socket from the renderer', () => {
    it('resolves the template in main and hands only output to the port', async () => {
        await expect(call(openRequest())).resolves.toEqual({ ok: true, value: {} });
        expect(opened).toEqual([
            {
                transport: 'websocket',
                connectionId: 'echo',
                url: 'wss://echo.example/socket',
                headers: { 'x-target': 'echo.example' },
            },
        ]);
        expect(asserted).toEqual(['wss://echo.example/socket']);
    });

    it('refuses authority injection after interpolation without reaching the port', async () => {
        await writeEnvironment(
            root,
            'payments',
            createEnvironment({
                id: 'unsafe',
                name: 'Unsafe',
                variables: [
                    {
                        name: 'host',
                        value: 'evil.example/@real.example',
                        enabled: true,
                        secret: false,
                    },
                ],
            }),
        );

        await expect(call({ ...openRequest(), environmentId: 'unsafe' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'ws-open-failed' },
        });
        expect(opened).toEqual([]);
    });

    it('carries activity with the environment used to resolve it', async () => {
        await call(openRequest());
        events.onActivity({
            connectionId: 'echo',
            records: [{ direction: 'out', data: 'hola', at: 1 }],
        });

        expect(window.sent[0]?.[1]).toMatchObject({
            environmentId: 'local',
            records: [{ at: 1 }],
        });
    });
});
