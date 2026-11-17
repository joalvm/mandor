import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import {
    createWorkspace,
    writeRepoTree,
    writeActiveEnvironments,
    writeEnvironment,
    writeGlobals,
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
    root = await mkdtemp(join(tmpdir(), 'mandor-resolve-ws-workspace-'));
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

describe('resolveWsOpen against the globals of the origin', () => {
    function headerOf(rest: Partial<Input>) {
        return open({
            template: { url: 'wss://{{host}}/socket', headers: { 'x-from': '{{from}}' } },
            ...rest,
        });
    }

    it('resolves a name only the globals declare', async () => {
        await writeGlobals(root, {
            variables: [{ name: 'from', value: 'workspace', enabled: true, secret: false }],
        });

        const { request } = await headerOf({});

        expect(request.headers).toEqual({ 'x-from': 'workspace' });
    });

    it('lets the environment win when both declare the name', async () => {
        await writeGlobals(root, {
            variables: [{ name: 'host', value: 'workspace.example', enabled: true, secret: false }],
        });

        const { request } = await headerOf({});

        expect(request.url).toBe('wss://echo.example/socket');
    });

    it('refuses a global that could move the authority of the url', async () => {
        await writeGlobals(root, {
            variables: [{ name: 'edge', value: 'a@evil.example', enabled: true, secret: false }],
        });

        await expect(open({ template: { url: 'wss://{{edge}}/socket' } })).rejects.toThrow(
            'unsafe authority variable: edge',
        );
    });

    it('leaves the placeholder when nobody declares the name', async () => {
        const { request } = await headerOf({});

        expect(request.headers).toEqual({ 'x-from': '{{from}}' });
    });
});
