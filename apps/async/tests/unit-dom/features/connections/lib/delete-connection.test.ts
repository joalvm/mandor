import { failure, ROOT_GROUP_ID, success } from '@mandor/ipc';
import { selectGroupOfTab, shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { deleteConnection } from '../../../../../src/renderer/features/connections/lib/delete-connection.js';
import { selectFaultFor } from '../../../../../src/renderer/features/connections/selectors.js';
import { fakeConnection } from '../support/fake-connections.js';

const SCOPE = { workspaceId: 'events' };

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    connectionsStore.getState().upsertConnection(fakeConnection('echo', 'Echo'));
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id: 'echo',
        kind: 'connection',
        resource: 'mandor://local-apis/events/connection/echo',
    });
});

describe('deleting a connection', () => {
    it('asks main to delete the connection of the workspace', async () => {
        const remove = vi.spyOn(asyncBridge.connection, 'delete').mockResolvedValue(success({}));

        await deleteConnection(SCOPE, 'echo');

        expect(remove).toHaveBeenCalledWith({ connectionId: 'echo', workspaceId: 'events' });
    });

    it('takes the connection out of the window, and its tab with it, once main answers', async () => {
        vi.spyOn(asyncBridge.connection, 'delete').mockResolvedValue(success({}));

        await deleteConnection(SCOPE, 'echo');

        expect(connectionsStore.getState().connections).toEqual([]);
        expect(selectGroupOfTab(shellStore.getState(), 'echo')).toBeNull();
    });

    it('closes no tab when the connection had none open', async () => {
        vi.spyOn(asyncBridge.connection, 'delete').mockResolvedValue(success({}));
        shellStore.getState().closeTab(ROOT_GROUP_ID, 'echo');

        await deleteConnection(SCOPE, 'echo');

        expect(connectionsStore.getState().connections).toEqual([]);
    });

    /** A collection that forgets a connection the disk still holds is worse than a slow one. */
    it('keeps the connection and its tab when main refuses, and says why on the connection', async () => {
        vi.spyOn(asyncBridge.connection, 'delete').mockResolvedValue(failure('unknown', 'locked'));

        await deleteConnection(SCOPE, 'echo');

        expect(connectionsStore.getState().connections).toHaveLength(1);
        expect(selectGroupOfTab(shellStore.getState(), 'echo')).toBe(ROOT_GROUP_ID);
        expect(selectFaultFor('echo')(connectionsStore.getState())?.code).toBe('unknown');
    });
});
