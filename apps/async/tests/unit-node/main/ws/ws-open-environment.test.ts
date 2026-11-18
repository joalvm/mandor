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

import { closeRepo, type IpcSpy, openRepo, spyIpc, spyWindow } from '@mandor/host/testing';
import type { SocketManager, SocketOpenRequest } from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

let ipc: IpcSpy;
let dispose: () => void;
let opened: SocketOpenRequest[];
let root: string;

function openRequest(environmentId: string | null) {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId,
        template: { url: 'wss://{{host}}/socket', headers: { 'x-target': '{{host}}' } },
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
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-env-'));
    ipc = spyIpc();
    opened = [];
    dispose = registerWsHandlers(ipc, {
        window: spyWindow(),
        readSecret: () => Promise.resolve(null),
        networkFor: () => Promise.resolve({ tls: {} }),
        assertUrl: (_transport, value) => new URL(value),
        createManager: () => manager(),
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

/** The workspace of this repo has «local» active throughout, and the socket never asks for it. */
describe('which environment a socket resolves against', () => {
    it('uses the one the connection chose', async () => {
        await call(openRequest('local'));

        expect(opened[0]?.url).toBe('wss://echo.example/socket');
    });

    /**
     * Nothing stands above the connection: what the workspace has active belongs to the other
     * window. The placeholder survives and the socket fails where it can be seen, instead of
     * quietly resolving against a choice nobody made here.
     */
    it('resolves nothing for a connection that chose none', async () => {
        await call(openRequest(null));

        expect(opened).toEqual([
            {
                transport: 'websocket',
                connectionId: 'echo',
                url: 'wss://{{host}}/socket',
                headers: { 'x-target': '{{host}}' },
            },
        ]);
    });
});
