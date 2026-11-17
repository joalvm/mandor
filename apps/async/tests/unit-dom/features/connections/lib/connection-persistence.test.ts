import { failure, success } from '@mandor/ipc';
import type { Connection } from '@mandor/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import {
    connectionsStore,
    createConnection,
    loadConnections,
    selectConnections,
    selectFaultFor,
} from '../../../../../src/renderer/features/connections/index.js';
import { renameConnection } from '../../../../../src/renderer/features/connections/lib/rename-connection.js';
import type { WorkspaceScope } from '../../../../../src/renderer/features/connections/lib/workspace-scope.js';

const SCOPE: WorkspaceScope = { workspaceId: 'payments' };

function connection(id: string): Connection {
    return {
        id,
        name: id,
        transport: 'websocket',
        url: 'wss://example.test',
        headers: [],
        environmentId: null,
    };
}

beforeEach(() => {
    connectionsStore.getState().reset();
});

describe('connection persistence', () => {
    it('finds a created connection after reloading the store from disk', async () => {
        const stored: Connection[] = [];
        const persist = vi.spyOn(asyncBridge.connection, 'create').mockImplementation((input) => {
            const created: Connection = {
                id: input.name,
                name: input.name,
                transport: 'websocket',
                url: input.url,
                headers: input.headers ?? [],
                environmentId: null,
            };

            stored.push(created);

            return Promise.resolve(success(created));
        });

        vi.spyOn(asyncBridge.connection, 'list').mockImplementation(() =>
            Promise.resolve(success([...stored])),
        );

        await createConnection(SCOPE, {
            name: 'gateway',
            url: 'wss://example.test/socket',
            headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        });

        expect(persist).toHaveBeenCalledWith({
            workspaceId: SCOPE.workspaceId,
            name: 'gateway',
            url: 'wss://example.test/socket',
            headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
        });

        connectionsStore.getState().reset();
        await loadConnections(SCOPE);

        const found = selectConnections(connectionsStore.getState()).find(
            (entry) => entry.id === 'gateway',
        );

        expect(found?.url).toBe('wss://example.test/socket');
        expect(found?.headers).toEqual([
            { key: 'Authorization', value: 'Bearer token', enabled: true },
        ]);
    });

    it('keeps the connections of the workspace asked for last, whichever answers last', async () => {
        const answers = new Map<string, (connections: Connection[]) => void>();

        vi.spyOn(asyncBridge.connection, 'list').mockImplementation(
            ({ workspaceId }) =>
                new Promise((resolve) => {
                    answers.set(workspaceId, (connections) => {
                        resolve(success(connections));
                    });
                }),
        );

        const left = loadConnections({ workspaceId: 'left' });
        const opened = loadConnections({ workspaceId: 'opened' });

        answers.get('opened')?.([connection('opened')]);
        await opened;
        answers.get('left')?.([connection('left')]);
        await left;

        expect(selectConnections(connectionsStore.getState()).map((entry) => entry.id)).toEqual([
            'opened',
        ]);
    });

    it('restores the previous name and reports the code when a rename is refused', async () => {
        const original: Connection = {
            id: 'alpha',
            name: 'Gateway',
            transport: 'websocket',
            url: 'wss://example.test/socket',
            headers: [],
            environmentId: null,
        };

        connectionsStore.getState().upsertConnection(original);
        connectionsStore.getState().upsertConnection({ ...original, name: 'Principal' });
        vi.spyOn(asyncBridge.connection, 'update').mockResolvedValue(
            failure('fs-write', 'EACCES: permission denied'),
        );

        await renameConnection(SCOPE, original, 'Principal');

        expect(connectionsStore.getState().connections[0]?.name).toBe('Gateway');
        expect(selectFaultFor('alpha')(connectionsStore.getState())?.code).toBe('fs-write');
    });
});
