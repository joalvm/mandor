import { selectTabs, shellStore } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openResourceLink } from '../src/lib/open-resource-link.js';

const MOVED = 'mandor://local/events/connection/nuevo/pedido.yaml';

let unregister: () => void;

beforeEach(() => {
    unregister = declareTabKindSpec({
        closable: true,
        holds: () => Promise.resolve(true),
        icon: 'doc',
        id: 'connection',
        title: () => 'Pedido',
    });
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', kind: 'local', name: 'Local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    shellStore.getState().reset();
    unregister();
});

describe('a link of a doc to a thing moved while its tab was open', () => {
    it('brings that tab forward instead of opening a second one', async () => {
        const { activeGroupId, openTab } = shellStore.getState();

        openTab(activeGroupId, { id: 'nacida-antes', kind: 'connection', resource: MOVED });
        openTab(activeGroupId, {
            id: 'otra',
            kind: 'connection',
            resource: 'mandor://local/events/connection/b.yaml',
        });

        await expect(openResourceLink(MOVED, false)).resolves.toBeNull();

        const state = shellStore.getState();

        expect(selectTabs(state).map((tab) => tab.id)).toEqual(['nacida-antes', 'otra']);
        expect(state.grid).toMatchObject({ activeTab: 'nacida-antes' });
    });
});
