import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { NetworkFor } from '@mandor/host';
import type { WsOpenRequest } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { createWorkspace, writeEnvironment, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { scriptsBeforeConnect } from '../../../../src/main/ws/before-connect.js';
import { resolveWsOpen } from '../../../../src/main/ws/resolve-ws-open.js';

import { approvedScripts } from './support/approved-scripts.js';

// Why a socket lives with its secrets off, as the open resolves it with the guard of its scripts.

let root: string;

const DIRECT_NETWORK: NetworkFor = () => Promise.resolve({ tls: {} });

function place() {
    return {
        root,
        repo: 'local',
        readSecret: (key: string) =>
            Promise.resolve(key === 'local/payments/local/token' ? 'tok_abcdefgh' : null),
    };
}

function open(source: string, changes: Partial<WsOpenRequest> = {}): WsOpenRequest {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: 'local',
        template: { url: 'wss://echo.example/socket', headers: { Auth: '{{token}}' } },
        scripts: { onBeforeConnect: { source } },
        ...changes,
    };
}

function socketio(source: string, engineTransport?: WsOpenRequest['socketio']) {
    return open(source, {
        transport: 'socketio',
        template: { url: 'https://echo.example', headers: { Auth: '{{token}}' } },
        ...(engineTransport === undefined ? {} : { socketio: engineTransport }),
    });
}

async function resolved(input: WsOpenRequest) {
    const before = await scriptsBeforeConnect(
        approvedScripts(),
        place(),
        input,
        new AbortController().signal,
    );

    if (!before.result.ok) {
        throw new Error(before.result.error.message);
    }

    return resolveWsOpen(
        place(),
        input,
        { assertUrl: (_transport, value) => new URL(value), networkFor: DIRECT_NETWORK },
        before.result.value,
    );
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-ws-open-guard-'));
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
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('a websocket whose script shaped the handshake', () => {
    it('keeps its secrets on the same origin', async () => {
        const socket = await resolved(open('mandor.request.headers.set("X-Run", "1");'));

        expect(socket.secretsOff).toBeNull();
        expect(socket.request.headers).toMatchObject({ Auth: 'tok_abcdefgh', 'x-run': '1' });
    });

    it('lives with them off once a script moved where it goes', async () => {
        const socket = await resolved(
            open('mandor.request.url = "wss://elsewhere.example/socket";'),
        );

        expect(socket.secretsOff).toBe('destination');
        expect(socket.request.headers?.['Auth']).toBe('{{token}}');
    });

    it('lives with them off once a script wrote the Host line', async () => {
        const socket = await resolved(
            open('mandor.request.headers.set("host", "elsewhere.example");'),
        );

        expect(socket.secretsOff).toBe('destination');
    });
});

describe('a Socket.IO whose script shaped the handshake', () => {
    it('lives with its secrets off when it may poll', async () => {
        const said = await resolved(
            socketio('mandor.request.headers.set("X-Run", "1");', {
                engineTransport: 'polling-then-upgrade',
            }),
        );
        const bare = await resolved(socketio('mandor.request.headers.set("X-Run", "1");'));

        expect(said.secretsOff).toBe('polling');
        expect(bare.secretsOff).toBe('polling');
        expect(said.request.headers?.['Auth']).toBe('{{token}}');
    });

    it('keeps them over websocket alone', async () => {
        const socket = await resolved(
            socketio('mandor.request.headers.set("X-Run", "1");', {
                engineTransport: 'websocket-only',
            }),
        );

        expect(socket.secretsOff).toBeNull();
        expect(socket.request.headers?.['Auth']).toBe('tok_abcdefgh');
    });

    it('names the destination first when a script moved it', async () => {
        const socket = await resolved(
            socketio('mandor.request.url = "https://elsewhere.example";', {
                engineTransport: 'websocket-only',
            }),
        );

        expect(socket.secretsOff).toBe('destination');
    });

    it('keeps them when no script ran and none set a value', async () => {
        const socket = await resolved(socketio('', {}));

        expect(socket.secretsOff).toBeNull();
        expect(socket.request.headers?.['Auth']).toBe('tok_abcdefgh');
    });
});
