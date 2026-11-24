import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WsOpenRequest } from '@mandor/ipc';
import { createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    beforeConnectEntries,
    connectionPlaceOf,
    scriptsBeforeConnect,
} from '../../../../src/main/ws/before-connect.js';

import { approvedScripts } from './support/approved-scripts.js';

let root: string;

function place() {
    return { root, repo: 'local', readSecret: () => Promise.resolve(null) };
}

function input(source?: string, changes: Partial<WsOpenRequest> = {}): WsOpenRequest {
    return {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: null,
        template: { url: 'wss://echo.example/socket', headers: { 'X-Mine': '1' } },
        ...(source === undefined ? {} : { scripts: { onBeforeConnect: { source } } }),
        ...changes,
    };
}

function run(open: WsOpenRequest, deps = approvedScripts()) {
    return scriptsBeforeConnect(deps, place(), open, new AbortController().signal);
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-connection-scripts-'));
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the scripts a connection runs before it opens', () => {
    it('runs the script of onBeforeConnect, at the level of the connection', () => {
        expect(beforeConnectEntries(input('mandor.variables.set("a", "1");'))).toEqual([
            {
                level: 'connection',
                name: 'echo',
                event: 'onBeforeConnect',
                source: 'mandor.variables.set("a", "1");',
                enabled: undefined,
            },
        ]);
    });

    it('runs none for a connection without script, or an open that skips them', () => {
        expect(beforeConnectEntries(input())).toEqual([]);
        expect(beforeConnectEntries(input('throw 1;', { skipScripts: true }))).toEqual([]);
    });

    it('reads and sets the values of the place of the connection', () => {
        expect(
            connectionPlaceOf(place(), { workspaceId: 'payments', environmentId: 'qa' }),
        ).toEqual({
            origin: 'local',
            workspaceId: 'payments',
            environmentId: 'qa',
        });
    });
});

describe('the guard an open resolves with', () => {
    it('carries the handshake as the script left it, and as the window sent it', async () => {
        const before = await run(input('mandor.request.headers.set("X-Run", "1");'));

        expect(before.ran).toBe(true);
        expect(before.result).toMatchObject({
            ok: true,
            value: {
                base: { headers: { 'X-Mine': '1' } },
                applied: { template: { headers: { 'X-Mine': '1', 'x-run': '1' } } },
            },
        });
    });

    it('carries what scripts set in the place of the connection', async () => {
        const before = await run(input('mandor.variables.set("ticket", "tk-1");'));

        expect(before.result).toMatchObject({ ok: true, value: { script: { ticket: 'tk-1' } } });
    });

    it('says in the console that the socket will not reconnect on its own', async () => {
        const before = await run(input('mandor.variables.set("a", "1");'));

        expect(before.output?.logs.at(-1)).toEqual({ level: 'warn', notice: 'no-reconnect' });
    });

    it('lets an open with nothing to run go untouched, and adds no line', async () => {
        const before = await run(input());

        expect(before).toMatchObject({ output: undefined, ran: false });
        expect(before.result).toMatchObject({ ok: true, value: { applied: { wroteHost: false } } });
    });

    it('runs nothing for a script switched off, and says nothing of reconnecting', async () => {
        const before = await run(
            input(undefined, {
                scripts: { onBeforeConnect: { source: 'throw 1;', enabled: false } },
            }),
        );

        expect(before.ran).toBe(false);
        expect(before.result.ok).toBe(true);
        expect(before.output?.logs ?? []).toEqual([]);
    });

    it('refuses the open when the script fails, naming the connection', async () => {
        const before = await run(input('throw new Error("no ticket");'));

        expect(before.result).toMatchObject({
            ok: false,
            error: {
                code: 'script-failed',
                message: expect.stringContaining('connection echo') as unknown,
            },
        });
    });

    it('ends the open as a cancel when it was stopped', async () => {
        const controller = new AbortController();

        controller.abort('closed');

        const before = await scriptsBeforeConnect(
            approvedScripts(),
            place(),
            input('mandor.variables.set("a", "1");'),
            controller.signal,
        );

        expect(before.result).toMatchObject({ ok: false, error: { code: 'ws-open-cancelled' } });
    });
});
