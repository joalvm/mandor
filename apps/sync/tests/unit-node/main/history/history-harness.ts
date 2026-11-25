import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AppHandlerContext } from '@mandor/host';
import {
    closeRepo,
    forgetSecrets,
    noScripts,
    openRepo,
    redactingIpc,
    silentNotices,
    spyIpc,
    spyWindow,
    type IpcSpy,
    type WindowSpy,
} from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { createEnvironment, createRequestItem } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';

import { createHistoryRetention } from '../../../../src/main/history/history-retention.js';
import { registerHistoryHandlers } from '../../../../src/main/history/history.handlers.js';
import { createSendRecorder } from '../../../../src/main/history/send-recorder.js';
import { registerRequestHandlers } from '../../../../src/main/request/request.handlers.js';

/** The secret the origin hands out, and the one the server echoes back. */
export const SECRET = 'tok_history_secret_value';

/** An origin with a workspace, a server that echoes the key it was sent, and both sets of handlers. */
export type Harness = {
    root: string;
    server: Server;
    /** The paths that reached the server, in order: a send in flight is one of them. */
    arrived: string[];
    ipc: IpcSpy;
    window: WindowSpy;
    /** What main logged as a warning. */
    warnings: string[];
    dispose: () => void;
};

export function payload(url: string, options: { itemPath?: string; sendId?: string } = {}) {
    return {
        sendId: options.sendId ?? crypto.randomUUID(),
        workspaceId: 'payments',
        itemPath: options.itemPath ?? 'orders/list',
        environmentId: 'local',
        request: {
            ...createRequestItem({ name: 'Echo' }),
            url,
            headers: [{ key: 'X-Key', value: '{{token}}', enabled: true }],
        },
    };
}

async function startEcho(arrived: string[]): Promise<{ server: Server; origin: string }> {
    const server = createServer((request, response) => {
        arrived.push(request.url ?? '');

        if (request.url === '/slow') {
            return;
        }

        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end(`key=${String(request.headers['x-key'])}`);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return { server, origin: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}` };
}

async function seedOrigin(root: string, baseUrl: string): Promise<void> {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'baseUrl', value: baseUrl, enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
            ],
        }),
    );
}

export async function startHarness(): Promise<Harness> {
    const root = await mkdtemp(join(tmpdir(), 'mandor-history-handlers-'));
    const arrived: string[] = [];
    const { server, origin } = await startEcho(arrived);
    const ipc = spyIpc();
    const window = spyWindow();
    const warnings: string[] = [];
    const context: AppHandlerContext = {
        userDataDir: root,
        ...noScripts(),
        window: { ...window, isMaximized: () => false, on: () => undefined },
        logger: {
            log: (_level, message) => {
                warnings.push(message);
            },
            flush: () => Promise.resolve(),
        },
        notices: silentNotices(),
    };

    const retention = createHistoryRetention();

    await seedOrigin(root, origin);
    openRepo(root);

    const stopRequests = registerRequestHandlers(redactingIpc(ipc), {
        readSecret: () => Promise.resolve(SECRET),
        networkFor: () => Promise.resolve({ tls: {} }),
        chooseSavePath: () => Promise.resolve(null),
        afterSend: createSendRecorder(context, retention),
        scripts: context.scripts,
        scriptVariables: context.scriptVariables,
        logger: context.logger,
    });
    const stopHistory = registerHistoryHandlers(redactingIpc(ipc), retention);

    return {
        root,
        server,
        arrived,
        ipc,
        window,
        warnings,
        dispose: () => {
            stopRequests();
            stopHistory();
        },
    };
}

export async function stopHarness(harness: Harness): Promise<void> {
    harness.dispose();
    closeRepo();
    forgetSecrets();
    harness.server.closeAllConnections();
    await new Promise((resolve) => harness.server.close(resolve));
    await rm(harness.root, { recursive: true, force: true });
}

/** The names of the files the history of the workspace `payments` has on disk. */
export async function filesOf(harness: Harness): Promise<string[]> {
    return readdir(join(harness.root, '.mandor', 'history', 'payments')).catch(() => []);
}

/** The rows the list channel answers for a workspace, optionally of one request. */
export async function listedBy(harness: Harness, itemPath?: string): Promise<unknown[]> {
    const answer = await harness.ipc.call(CHANNELS.historyList, {
        workspaceId: 'payments',
        ...(itemPath === undefined ? {} : { itemPath }),
    });

    return (answer as { value: { entries: unknown[] } }).value.entries;
}
