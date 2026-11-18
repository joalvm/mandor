import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
    openRepo,
    spyIpc,
    spyWindow,
    type IpcSpy,
} from '@mandor/host/testing';
import type { SocketManager, SocketOpenRequest } from '../../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../../src/main/ws/ws.handlers.js';

let ipc: IpcSpy;
let dispose: () => void;
let opened: SocketOpenRequest[];
let kept: Record<string, string>;
let root: string;

function openRequest(auth: unknown, headers: Record<string, string> = { 'x-target': '{{host}}' }) {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: 'local',
        template: { url: 'wss://{{host}}/socket', headers, auth },
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
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-auth-'));
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
            variables: [
                { name: 'host', value: 'echo.example', enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
            ],
        }),
    );
    await writeActiveEnvironments(root, { payments: 'local' });

    // The auth the workspace carries: a bearer whose token is a secret variable.
    await writeFile(
        join(root, 'workspaces', 'payments', 'workspace.yaml'),
        'name: Payments\nkind: async\nid: payments\nauth:\n  type: bearer\n  token: "{{token}}"\n',
        'utf8',
    );

    openRepo(root);
});

afterEach(async () => {
    dispose();
    closeRepo();
    forgetSecrets();

    await rm(root, { recursive: true, force: true });
});

describe('opening a socket with auth in the chain', () => {
    /** A connection that inherits dials with the bearer of the workspace, resolved and secret. */
    it('dials the handshake with the auth of the workspace written as inherit: true', async () => {
        kept['local/payments/local/token'] = 'tok_abcdefgh';

        await expect(call(openRequest({ inherit: true }))).resolves.toEqual({
            ok: true,
            value: {},
        });

        expect(opened[0]?.headers).toEqual({
            Authorization: 'Bearer tok_abcdefgh',
            'x-target': 'echo.example',
        });
    });

    it('dials no credential when the connection decides there is none', async () => {
        await expect(call(openRequest({ type: 'none' }))).resolves.toEqual({ ok: true, value: {} });

        expect(opened[0]?.headers).toEqual({ 'x-target': 'echo.example' });
    });

    it('lets the header the connection wrote win over the one the auth would add', async () => {
        kept['local/payments/local/token'] = 'tok_abcdefgh';

        await call(openRequest({ inherit: true }, { authorization: 'Bearer written-aloud' }));

        // The written header travels as it was named, and the auth adds nothing around it.
        expect(opened[0]?.headers).toEqual({ authorization: 'Bearer written-aloud' });
    });

    it('refuses an api key placed in a cookie: the handshake carries none', async () => {
        await expect(
            call(openRequest({ type: 'apikey', name: 'session', value: 'k', in: 'cookie' })),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(opened).toEqual([]);
    });
});
