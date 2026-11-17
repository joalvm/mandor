import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UnsupportedProxyError, type DialNetwork } from '@mandor/host';
import { SocketOpenError } from '@mandor/transport-async';
import { closeRepo, openRepo } from '@mandor/host/testing';
import { openSocket, type OpenedSocket } from '../../../../src/main/ws/open-socket.js';
import type { SocketManager, SocketOpenRequest } from '../../../../src/main/ws/socket-manager.js';

// openSocket, and the refusal socket-attempt gives when the network of the settings says no.

const REQUEST = {
    transport: 'websocket',
    connectionId: 'echo',
    workspaceId: 'payments',
    environmentId: null,
    template: { url: 'wss://echo.example/socket', headers: {} },
};

let root: string;
let dialed: string[];
let opened: SocketOpenRequest[];
let kept: Map<string, OpenedSocket>;

function port(refuse?: Error): SocketManager {
    return {
        close: () => Promise.resolve(),
        disposeAll: () => undefined,
        open: (request) => {
            if (refuse !== undefined) {
                return Promise.reject(refuse);
            }

            opened.push(request);

            return Promise.resolve();
        },
        retryNow: () => Promise.resolve(),
        send: () => Promise.resolve(),
    };
}

function open(network: DialNetwork | Error, refuse?: Error) {
    return openSocket(
        {
            manager: port(refuse),
            opened: kept,
            opening: new Map(),
            assertUrl: (_transport, value) => new URL(value),
            readSecret: () => Promise.resolve(null),
            networkFor: (url) => {
                dialed.push(url);

                return network instanceof Error
                    ? Promise.reject(network)
                    : Promise.resolve(network);
            },
        },
        REQUEST,
    );
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-open-socket-'));
    dialed = [];
    opened = [];
    kept = new Map();
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    openRepo(root);
});

afterEach(async () => {
    closeRepo();
    await rm(root, { recursive: true, force: true });
});

describe('the network a socket opens through', () => {
    it('adds neither proxy nor certificates when the settings name none', async () => {
        await expect(open({ tls: {} })).resolves.toEqual({ ok: true, value: {} });
        expect(opened).toEqual([
            {
                transport: 'websocket',
                connectionId: 'echo',
                url: 'wss://echo.example/socket',
                headers: {},
            },
        ]);
    });

    /** The settings of the network decide the way out and the trust, for the url resolved. */
    it('dials through the proxy and with the certificates the network settings name', async () => {
        const pfx = new Uint8Array([1, 2, 3]);

        await open({
            proxy: { url: 'socks4://corp.test:1080' },
            tls: { ca: 'ROOTS', pfx, passphrase: 'open' },
        });

        expect(dialed).toEqual(['wss://echo.example/socket']);
        expect(opened[0]).toMatchObject({
            proxy: { url: 'socks4://corp.test:1080' },
            tls: { ca: 'ROOTS', pfx, passphrase: 'open' },
        });
    });

    it('answers network-proxy, and opens nothing, on a proxy of the system nobody speaks', async () => {
        const answer = await open(new UnsupportedProxyError('QUIC'));

        expect(answer).toMatchObject({ ok: false, error: { code: 'network-proxy' } });
        expect(opened).toEqual([]);
        expect(kept.size).toBe(0);
    });

    it('answers a socket that could not open with the code of its reason, and forgets it', async () => {
        const cause = new Error('connect ECONNREFUSED 127.0.0.1:1');
        const answer = await open({ tls: {} }, new SocketOpenError('refused', cause));

        expect(answer).toMatchObject({ ok: false, error: { code: 'ws-open-unreachable' } });
        expect(answer.ok ? '' : answer.error.message).toContain('ECONNREFUSED');
        expect(kept.size).toBe(0);
    });

    it('answers what the transport could not name with the code of the channel', async () => {
        const answer = await open({ tls: {} }, new Error('the manager broke'));

        expect(answer).toMatchObject({ ok: false, error: { code: 'ws-open-failed' } });
    });
});
