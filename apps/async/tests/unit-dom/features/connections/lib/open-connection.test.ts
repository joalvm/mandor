import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { selectTabs, shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { openConnection } from '../../../../../src/renderer/features/connections/lib/open-connection.js';
import { fakeConnection } from '../support/fake-connections.js';

const SCOPE = { workspaceId: 'events' };
const ECHO = fakeConnection('echo', 'Echo');

beforeEach(() => {
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

describe('opening a connection', () => {
    it('opens a tab on the resource of the connection and marks it active', () => {
        openConnection(ECHO, SCOPE);

        expect(selectTabs(shellStore.getState())).toEqual([
            {
                id: 'echo',
                kind: 'connection',
                resource: 'mandor://local-apis/events/connection/echo',
            },
        ]);
        expect(connectionsStore.getState().activeConnectionId).toBe('echo');
    });

    /** One connection is one resource: a second tab of it would be the same view twice. */
    it('focuses the tab that already holds the connection instead of opening a second', () => {
        openConnection(ECHO, SCOPE);
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'x',
            kind: 'connection',
            resource: 'mandor://local-apis/events/connection/x',
        });

        openConnection(ECHO, SCOPE);

        expect(selectTabs(shellStore.getState()).map((tab) => tab.id)).toEqual(['echo', 'x']);
        expect(shellStore.getState().grid).toMatchObject({ activeTab: 'echo' });
    });

    it('opens it in a group of its own when asked aside', () => {
        openConnection(fakeConnection('first', 'First'), SCOPE);

        openConnection(ECHO, SCOPE, { aside: true });

        const groups = leavesOf(shellStore.getState().grid);

        expect(groups).toHaveLength(2);
        expect(groups[1]?.tabs.map((tab) => tab.id)).toEqual(['echo']);
    });

    it('opens it in the group it was sent to', () => {
        openConnection(fakeConnection('first', 'First'), SCOPE, { aside: true });
        const [, aside] = leavesOf(shellStore.getState().grid);

        openConnection(ECHO, SCOPE, { groupId: aside?.id ?? '' });

        expect(leavesOf(shellStore.getState().grid)[1]?.tabs.map((tab) => tab.id)).toEqual([
            'first',
            'echo',
        ]);
    });
});
