import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    closeRepo,
    forgetSecrets,
    noScripts,
    openRepo,
    redactingIpc,
    spyIpc,
    type IpcSpy,
} from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { createEnvironment, createRequestItem } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';
import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRequestHandlers } from '../../../../src/main/request/request.handlers.js';

const SECRET = 'tok_handlers_secret_value';

const REQUEST_CHANNELS = [
    CHANNELS.requestSend,
    CHANNELS.requestCancel,
    CHANNELS.requestBodyRead,
    CHANNELS.requestBodySave,
    CHANNELS.requestHideSecrets,
];

let root: string;
let server: Server;
let origin: string;
let ipc: IpcSpy;
let dispose: () => void;
let saved: string | null;
/** The paths that reached the server, in order: a send in flight is one of them. */
let arrived: string[];

function payload(url: string, sendId = crypto.randomUUID()) {
    return {
        sendId,
        workspaceId: 'payments',
        itemPath: 'orders/list',
        environmentId: 'local',
        request: {
            ...createRequestItem({ name: 'Echo' }),
            url,
            headers: [{ key: 'X-Key', value: '{{token}}', enabled: true }],
        },
    };
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-request-handlers-'));
    saved = null;
    arrived = [];
    server = createServer((request, response) => {
        arrived.push(request.url ?? '');

        if (request.url === '/slow') {
            return;
        }

        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end(`key=${String(request.headers['x-key'])}`);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'baseUrl', value: origin, enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
            ],
        }),
    );
    openRepo(root);
    ipc = spyIpc();
    dispose = registerRequestHandlers(redactingIpc(ipc), {
        readSecret: () => Promise.resolve(SECRET),
        networkFor: () => Promise.resolve({ tls: {} }),
        chooseSavePath: () => Promise.resolve(saved),
        ...noScripts(),
        logger: { log: () => undefined },
    });
});

afterEach(async () => {
    dispose();
    closeRepo();
    forgetSecrets();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
});

describe('the channels of a request', () => {
    it('registers the four channels and removes them all', () => {
        expect(ipc.registered()).toEqual(REQUEST_CHANNELS);

        dispose();

        expect(ipc.registered()).toEqual([]);
    });

    /** The server echoes the secret it was sent: it must not reach the window. */
    it('hides a secret the server echoes before the answer leaves main', async () => {
        const answer = await ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/echo'));

        expect(JSON.stringify(answer)).toContain(`key=${REDACTED}`);
        expect(JSON.stringify(answer)).not.toContain(SECRET);
    });

    it('cuts the send in flight when the window cancels it', async () => {
        const sendId = crypto.randomUUID();
        const pending = ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/slow', sendId));

        await vi.waitFor(() => {
            expect(arrived).toContain('/slow');
        });

        expect(await ipc.call(CHANNELS.requestCancel, { sendId })).toEqual({ ok: true, value: {} });
        expect(await pending).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
    });

    it('cancels nothing, and says it went well, when the send already ended', async () => {
        const answer = await ipc.call(CHANNELS.requestCancel, { sendId: crypto.randomUUID() });

        expect(answer).toEqual({ ok: true, value: {} });
    });

    it('cuts what is still in flight when it is disposed', async () => {
        const pending = ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/slow'));

        await vi.waitFor(() => {
            expect(arrived).toContain('/slow');
        });
        dispose();

        expect(await pending).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
    });

    it('refuses what the contract does not describe, on every channel', async () => {
        for (const channel of REQUEST_CHANNELS) {
            expect(await ipc.call(channel, { nonsense: true })).toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
        }
    });

    it('saves through the open origin', async () => {
        saved = join(root, 'out.txt');

        expect(
            await ipc.call(CHANNELS.requestBodySave, {
                encoding: 'utf8',
                text: 'x',
                suggestedName: 'out.txt',
            }),
        ).toEqual({ ok: true, value: { path: saved } });
    });

    it('refuses to read or save while no origin is open', async () => {
        closeRepo();

        expect(
            await ipc.call(CHANNELS.requestBodyRead, { ref: 'a'.repeat(64), offset: 0, length: 1 }),
        ).toMatchObject({ ok: false });
        expect(
            await ipc.call(CHANNELS.requestBodySave, { ref: 'a'.repeat(64), suggestedName: 'x' }),
        ).toMatchObject({ ok: false });
    });
});
