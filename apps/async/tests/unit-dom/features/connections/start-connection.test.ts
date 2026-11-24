import type { FakeBridge } from '@mandor/ipc/testing';
import { selectTabs, shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectionsStore } from '../../../../src/renderer/features/connections/connections-store.js';
import { startConnection } from '../../../../src/renderer/features/connections/lib/start-connection.js';

const SCOPE = { workspaceId: 'events' };

function seedWindow(): void {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    seedWindow();
});

describe('starting a connection', () => {
    it('creates a websocket connection with an empty url and opens its tab', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const create = vi.spyOn(fakeBridge.connection, 'create');

        await startConnection({ name: 'New connection', notify: () => undefined, scope: SCOPE });

        expect(create).toHaveBeenCalledWith({
            name: 'New connection',
            transport: 'websocket',
            url: '',
            workspaceId: 'events',
        });
        expect(selectTabs(shellStore.getState())).toEqual([
            {
                id: 'new-connection',
                kind: 'connection',
                resource: 'mandor://local-apis/events/connection/new-connection',
            },
        ]);
    });

    it('leaves the row of the new connection as it is, the work going on in its tab', async () => {
        await startConnection({ name: 'New connection', notify: () => undefined, scope: SCOPE });

        expect(connectionsStore.getState().renaming).toBeNull();
    });

    it('numbers the word when another connection already wears it', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const create = vi.spyOn(fakeBridge.connection, 'create');

        connectionsStore.getState().upsertConnection({
            id: 'new-connection',
            name: 'New connection',
            transport: 'websocket',
            url: 'ws://localhost:3000',
            headers: [],
            environmentId: null,
        });
        await startConnection({ name: 'New connection', notify: () => undefined, scope: SCOPE });

        expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New connection 2' }));
    });

    it('says nothing when there is no workspace to write in', async () => {
        const fakeBridge = window.mandor as FakeBridge;
        const create = vi.spyOn(fakeBridge.connection, 'create');
        const notify = vi.fn();

        await startConnection({ name: 'New connection', notify, scope: null });

        expect(create).not.toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });

    it('names the failure when main refuses to write the connection', async () => {
        const fakeBridge = window.mandor as FakeBridge;

        vi.spyOn(fakeBridge.connection, 'create').mockResolvedValue({
            ok: false,
            error: { code: 'fs-write', message: 'busy' },
        });
        const notify = vi.fn();

        await startConnection({ name: 'New connection', notify, scope: SCOPE });

        expect(notify).toHaveBeenCalledWith('fs-write');
        expect(connectionsStore.getState().renaming).toBeNull();
    });
});
