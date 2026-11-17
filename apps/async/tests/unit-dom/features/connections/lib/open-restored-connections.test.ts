import { ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { openRestoredConnections } from '../../../../../src/renderer/features/connections/lib/open-restored-connections.js';
import { fakeConnection } from '../support/fake-connections.js';

function dialling(id: string) {
    return { ...fakeConnection(id, id), autoConnect: true };
}

function showTab(id: string): void {
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id,
        kind: 'connection',
        resource: `mandor://local-apis/events/connection/${id}`,
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

describe('dialling the connections a window came back with', () => {
    it('dials the connection that asked for it when its tab is on screen', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');

        showTab('alpha');
        const off = openRestoredConnections([dialling('alpha')]);

        await vi.waitFor(() => {
            expect(open).toHaveBeenCalledTimes(1);
        });
        expect(open).toHaveBeenCalledWith(expect.objectContaining({ connectionId: 'alpha' }));
        off();
    });

    it('leaves closed the connection whose file did not ask to be dialled', () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');

        showTab('beta');
        const off = openRestoredConnections([fakeConnection('beta', 'beta')]);

        expect(open).not.toHaveBeenCalled();
        off();
    });

    it('waits for the tab and dials the connection then, once', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const off = openRestoredConnections([dialling('alpha')]);

        expect(open).not.toHaveBeenCalled();

        showTab('alpha');
        showTab('other');

        await vi.waitFor(() => {
            expect(open).toHaveBeenCalledTimes(1);
        });
        off();
    });

    it('dials nothing while the window has no workspace', () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');

        shellStore.setState({ activeWorkspaceId: null });
        showTab('alpha');
        const off = openRestoredConnections([dialling('alpha')]);

        expect(open).not.toHaveBeenCalled();
        off();
    });

    it('lets go of what never matched when the cleanup runs', () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const off = openRestoredConnections([dialling('alpha')]);

        off();
        showTab('alpha');

        expect(open).not.toHaveBeenCalled();
    });
});
