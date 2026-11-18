import { failure, success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { createConnection } from '../../../../../src/renderer/features/connections/lib/create-connection.js';
import { fakeConnection } from '../support/fake-connections.js';

const SCOPE = { workspaceId: 'events' };
const INPUT = { name: 'Echo', transport: 'websocket', url: 'ws://localhost:3000' } as const;

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
});

describe('creating a connection', () => {
    it('asks main to write it in the workspace of the scope', async () => {
        const create = vi
            .spyOn(asyncBridge.connection, 'create')
            .mockResolvedValue(success(fakeConnection('echo', 'Echo')));

        await createConnection(SCOPE, INPUT);

        expect(create).toHaveBeenCalledWith({ ...INPUT, workspaceId: 'events' });
    });

    it('puts into the window the connection main wrote', async () => {
        vi.spyOn(asyncBridge.connection, 'create').mockResolvedValue(
            success(fakeConnection('echo', 'Echo')),
        );

        const result = await createConnection(SCOPE, INPUT);

        expect(result.ok).toBe(true);
        expect(connectionsStore.getState().connections.map((each) => each.id)).toEqual(['echo']);
    });

    it('puts nothing into the window when main refuses, and hands the refusal back', async () => {
        vi.spyOn(asyncBridge.connection, 'create').mockResolvedValue(
            failure('unknown', 'disk full'),
        );

        const result = await createConnection(SCOPE, INPUT);

        expect(result.ok).toBe(false);
        expect(connectionsStore.getState().connections).toEqual([]);
    });
});
