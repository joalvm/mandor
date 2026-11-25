import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import {
    createWorkspace,
    writeRepoTree,
    writeActiveEnvironments,
    writeEnvironment,
} from '@mandor/store-fs';
import type { NetworkFor } from '@mandor/host';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveWsOpen } from '../../../../src/main/ws/resolve-ws-open.js';

type Input = Parameters<typeof resolveWsOpen>[1];

let root: string;

/** The network of a dial whose auth asks for no token: nothing goes out through it. */
const DIRECT_NETWORK: NetworkFor = () => Promise.resolve({ tls: {} });

function place() {
    return { root, repo: 'local', readSecret: () => Promise.resolve(null) };
}

function input(rest: Partial<Input> = {}): Input {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: 'local',
        template: { url: 'wss://{{host}}/socket', headers: { 'x-target': '{{host}}' } },
        ...rest,
    };
}

function open(rest: Partial<Input> = {}) {
    return resolveWsOpen(place(), input(rest), {
        assertUrl: (_transport, value) => new URL(value),
        networkFor: DIRECT_NETWORK,
    });
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-resolve-ws-open-'));
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
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('resolveWsOpen', () => {
    it('resolves the url and the headers against the environment of the connection', async () => {
        const { environmentId, request } = await open();

        expect(environmentId).toBe('local');
        expect(request).toMatchObject({
            connectionId: 'echo',
            transport: 'websocket',
            url: 'wss://echo.example/socket',
            headers: { 'x-target': 'echo.example' },
        });
    });

    it('carries only the options the connection set', async () => {
        const bare = await open();
        const set = await open({
            maximumMessageSizeBytes: 1024,
            verifyCertificate: false,
            handshakeTimeoutMs: 2_000,
        });

        expect(bare.request).not.toHaveProperty('maximumMessageSizeBytes');
        expect(bare.request).not.toHaveProperty('verifyCertificate');
        expect(bare.request).not.toHaveProperty('handshakeTimeoutMs');
        expect(set.request).toMatchObject({
            maximumMessageSizeBytes: 1024,
            verifyCertificate: false,
            handshakeTimeoutMs: 2_000,
        });
    });

    it('flattens the Socket.IO dial and leaves a websocket open without it', async () => {
        const socketio = await open({
            transport: 'socketio',
            socketio: { namespace: '/chat', enginePath: '/io', version: 'v2' },
        });

        expect(socketio.request).toMatchObject({
            namespace: '/chat',
            enginePath: '/io',
            socketioVersion: 'v2',
        });
        expect((await open()).request).not.toHaveProperty('namespace');
    });

    it('offers the subprotocols the connection wrote', async () => {
        expect((await open({ subprotocols: ['v1', 'v2'] })).request.subprotocols).toEqual([
            'v1',
            'v2',
        ]);
        expect((await open()).request).not.toHaveProperty('subprotocols');
    });

    it('appends the query the auth produces to the resolved url', async () => {
        const { request } = await open({
            template: {
                url: 'wss://{{host}}/socket?room=1',
                auth: { type: 'apikey', name: 'key', value: 'abc', in: 'query' },
            },
        });

        expect(request.url).toBe('wss://echo.example/socket?room=1&key=abc');
    });

    it('appends the params the table says before the query the auth produces', async () => {
        const { request } = await open({
            template: {
                url: 'wss://{{host}}/socket',
                params: [
                    { key: 'room', value: '1', enabled: true },
                    { key: 'draft', value: 'x', enabled: false },
                    { key: 'half', value: 'ignored', enabled: true },
                    { key: 'token', value: '{{host}}', enabled: true },
                ].map((line) => ({ ...line, key: line.key === 'half' ? '' : line.key })),
                auth: { type: 'apikey', name: 'key', value: 'abc', in: 'query' },
            },
        });

        expect(request.url).toBe('wss://echo.example/socket?room=1&token=echo.example&key=abc');
    });

    it('dials a url typed without its scheme with the one its transport speaks', async () => {
        const template = { url: 'localhost:81/socket' };
        const websocket = await open({ template });
        const socketio = await open({ template, transport: 'socketio' });

        expect(websocket.request.url).toBe('ws://localhost:81/socket');
        expect(socketio.request.url).toBe('http://localhost:81/socket');
    });

    it('sends a header value pasted with its line break without the break', async () => {
        const { request } = await open({
            template: { url: 'wss://{{host}}/', headers: { 'user-agent': 'Mozilla/5.0\r\n' } },
        });

        expect(request.headers).toEqual({ 'user-agent': 'Mozilla/5.0' });
    });

    it('refuses a url the scheme gate of the transport refuses', async () => {
        await expect(
            resolveWsOpen(place(), input(), {
                assertUrl: () => {
                    throw new Error('scheme refused');
                },
                networkFor: DIRECT_NETWORK,
            }),
        ).rejects.toThrow('scheme refused');
    });
});
