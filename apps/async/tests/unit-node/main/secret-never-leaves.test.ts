import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    closeRepo,
    forgetSecrets,
    openRepo,
    redactingIpc,
    spyIpc,
    spyWindow,
    type IpcSpy,
    type WindowSpy,
} from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import {
    createWorkspace,
    writeRepoTree,
    writeActiveEnvironments,
    writeEnvironment,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerJsonlExportHandlers } from '../../../src/main/export/jsonl.handlers.js';
import type { SocketManagerEvents } from '../../../src/main/ws/socket-manager.js';
import { registerWsHandlers } from '../../../src/main/ws/ws.handlers.js';

/** Long enough to be hidden, and shaped like what a user pastes into a token field. */
const VALUE = 'tok_9f4c2ae7';
const HEADER = `Bearer ${VALUE}`;

let ipc: IpcSpy;
let window: WindowSpy;
let events: SocketManagerEvents;
let disposers: (() => void)[];
let dir: string;

async function openSocket(): Promise<unknown> {
    return ipc.call(CHANNELS.wsOpen, {
        transport: 'websocket',
        connectionId: 'echo',
        workspaceId: 'payments',
        environmentId: 'local',
        template: {
            url: 'wss://echo.example/socket',
            headers: { Authorization: 'Bearer {{token}}' },
        },
    });
}

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-leak-'));
    ipc = spyIpc();
    window = spyWindow();
    disposers = [
        registerWsHandlers(redactingIpc(ipc), {
            window,
            assertUrl: (_transport, value) => new URL(value),
            createManager: (given) => {
                events = given;

                return {
                    close: () => Promise.resolve(),
                    disposeAll: () => undefined,
                    open: (request) => Promise.reject(new Error(JSON.stringify(request.headers))),
                    retryNow: () => Promise.resolve(),
                    send: () => Promise.resolve(),
                };
            },
            readSecret: () => Promise.resolve(VALUE),
            networkFor: () => Promise.resolve({ tls: {} }),
        }),
        registerJsonlExportHandlers(redactingIpc(ipc), {
            chooseSavePath: () => Promise.resolve(join(dir, 'activity.jsonl')),
        }),
    ];
    await writeRepoTree(dir, 'Demo');
    await createWorkspace(dir, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(
        dir,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [{ name: 'token', value: '', enabled: true, secret: true }],
        }),
    );
    await writeActiveEnvironments(dir, { payments: 'local' });
    openRepo(dir);
});

afterEach(async () => {
    for (const dispose of disposers) {
        dispose();
    }

    closeRepo();
    forgetSecrets();
    await rm(dir, { recursive: true, force: true });
});

/**
 * One test per border out of the process that only Async has: the socket and the file its
 * activity is exported to. Each starts with a connection whose header is built from a value
 * this machine keeps and the repo never saw. The borders both apps share are tested in the host.
 */
describe('a connection whose header is built from a secret', () => {
    it('reaches the renderer with the marker in place of the value', async () => {
        await openSocket();
        events.onActivity({
            connectionId: 'echo',
            records: [{ direction: 'out', data: HEADER, at: 0 }],
        });

        const [channel, message] = window.sent.at(-1) ?? [];

        expect(channel).toBe(CHANNELS.wsActivity);
        expect(JSON.stringify(message)).toContain('[redacted]');
        expect(JSON.stringify(message)).not.toContain(VALUE);
    });

    it('reaches the exported jsonl with the marker in place of the value', async () => {
        await openSocket();
        await ipc.call(CHANNELS.exportJsonl, {
            suggestedName: 'activity.jsonl',
            records: [{ direction: 'out', headers: { Authorization: HEADER } }],
        });

        const written = await readFile(join(dir, 'activity.jsonl'), 'utf8');

        expect(written).toContain('[redacted]');
        expect(written).not.toContain(VALUE);
    });

    /** The port refuses with the headers in the message: the answer of the channel carries it. */
    it('comes back over the channel with the marker in place of the value', async () => {
        const answer = JSON.stringify(await openSocket());

        expect(answer).toContain('[redacted]');
        expect(answer).not.toContain(VALUE);
    });
});
