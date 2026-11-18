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
    forgetSecrets,
    type IpcSpy,
    openRepo,
    secretsOfRun,
    spyIpc,
    spyWindow,
} from '@mandor/host/testing';
import type { SocketManager, SocketOpenRequest } from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

let ipc: IpcSpy;
let dispose: () => void;
let opened: SocketOpenRequest[];
let kept: Record<string, string>;
let root: string;

function openRequest(headers: Record<string, string>) {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: 'local',
        template: { url: 'wss://echo.example/socket', headers },
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
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-secret-'));
    ipc = spyIpc();
    opened = [];
    kept = {};
    dispose = registerWsHandlers(ipc, {
        window: spyWindow(),
        assertUrl: (_transport, value) => new URL(value),
        createManager: () => manager(),
        readSecret: (key) => Promise.resolve(kept[key] ?? null),
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
    await writeActiveEnvironments(root, { payments: 'local' });
    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();
    forgetSecrets();
    await rm(root, { recursive: true, force: true });
});

describe('opening a socket with a secret variable', () => {
    /** The file keeps no value: the only place the value can come from is the keychain. */
    it('builds the header from the value the system keeps, not from the file', async () => {
        kept['local/payments/local/token'] = 'tok_abcdefgh';

        await expect(call(openRequest({ Authorization: 'Bearer {{token}}' }))).resolves.toEqual({
            ok: true,
            value: {},
        });
        expect(opened[0]?.headers).toEqual({ Authorization: 'Bearer tok_abcdefgh' });
    });

    it('hands the resolved value to the session so every edge can hide it', async () => {
        kept['local/payments/local/token'] = 'tok_abcdefgh';

        await call(openRequest({ Authorization: 'Bearer {{token}}' }));

        expect(secretsOfRun()).toContain('tok_abcdefgh');
    });

    /** A machine that keeps no value for a declared secret has an empty variable, not a hole. */
    it('leaves the placeholder when this machine keeps no value for the name', async () => {
        await call(openRequest({ Authorization: 'Bearer {{token}}' }));

        expect(opened[0]?.headers).toEqual({ Authorization: 'Bearer {{token}}' });
        expect(secretsOfRun()).toEqual([]);
    });

    it('refuses an authority built from a secret value that carries a separator', async () => {
        kept['local/payments/local/token'] = 'evil.example/';

        const answer = await ipc.call(CHANNELS.wsOpen, {
            transport: 'websocket',
            connectionId: 'echo',
            workspaceId: 'payments',
            environmentId: 'local',
            template: { url: 'wss://{{token}}/socket', headers: {} },
        });

        expect(answer).toMatchObject({ ok: false });
        expect(opened).toEqual([]);
    });
});
