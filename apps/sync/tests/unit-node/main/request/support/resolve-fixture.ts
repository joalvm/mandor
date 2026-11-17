import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { NetworkFor } from '@mandor/host';
import type { RequestSendRequest } from '@mandor/ipc';
import { createEnvironment, createRequestItem } from '@mandor/schema';
import { createWorkspace, writeRepoTree, writeEnvironment } from '@mandor/store-fs';

/** The network of a resolve whose auth asks for no token: nothing goes out through it. */
export const DIRECT_NETWORK: NetworkFor = () => Promise.resolve({ tls: {} });

/** A repo with the workspace `payments` and its environment `local`; returns its root. */
export async function repoWithEnvironment(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'mandor-resolve-request-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'sync' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'baseUrl', value: 'http://api.test', enabled: true, secret: false },
                { name: 'page', value: '2', enabled: true, secret: false },
                { name: 'token', value: '', enabled: true, secret: true },
            ],
        }),
    );

    return root;
}

export function placeOf(root: string, secret: string | null = null) {
    return { root, repo: 'demo', readSecret: () => Promise.resolve(secret) };
}

export function sendInput(request: Partial<RequestSendRequest['request']>): RequestSendRequest {
    return {
        sendId: '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11',
        workspaceId: 'payments',
        itemPath: 'orders/list',
        environmentId: 'local',
        request: { ...createRequestItem({ name: 'List' }), ...request },
    };
}

export function line(key: string, value: string, enabled = true) {
    return { key, value, enabled };
}
