import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openLooseRequest } from '../../../../src/renderer/features/requests/lib/open-loose-request.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

function openTabs() {
    return leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs);
}

function names(): string[] {
    return Object.values(requestsStore.getState().requests).map((request) => request.name);
}

beforeEach(() => {
    requestsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
});

afterEach(() => {
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

describe('opening a request saved nowhere', () => {
    it('opens a blank one under the word, numbered when another one wears it', () => {
        openLooseRequest(ROOT_GROUP_ID, 'New request');
        openLooseRequest(ROOT_GROUP_ID, 'New request');

        expect(names()).toEqual(['New request', 'New request 2']);
        expect(openTabs().map((tab) => tab.kind)).toEqual(['loose-request', 'loose-request']);
        expect(requestsStore.getState().pendings).toEqual({});
    });

    it('fills it as an edit, so its tab asks before letting it go', () => {
        openLooseRequest(ROOT_GROUP_ID, 'New request', (blank) => ({
            ...blank,
            url: 'http://api.test/orders',
        }));

        const resource = openTabs()[0]?.resource ?? '';

        expect(requestsStore.getState().requests[resource]?.url).toBe('http://api.test/orders');
        expect(requestsStore.getState().pendings[resource]?.before?.url).toBe('');
    });

    it('opens nothing with no workspace to send from', () => {
        shellStore.setState({ activeWorkspaceId: null });

        openLooseRequest(ROOT_GROUP_ID, 'New request');

        expect(openTabs()).toEqual([]);
        expect(names()).toEqual([]);
    });
});
