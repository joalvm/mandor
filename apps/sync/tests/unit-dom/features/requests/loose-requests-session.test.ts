import { itemResource } from '@mandor/collections';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { createRequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    looseResource,
    looseTabId,
} from '../../../../src/renderer/features/requests/lib/loose-resource.js';
import { registerLooseRequests } from '../../../../src/renderer/features/requests/lib/loose-requests-session.js';
import { openLooseRequest } from '../../../../src/renderer/features/requests/lib/open-loose-request.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = looseResource('Local', 'local', 'a1b2');
const BLANK = createRequestItem({ name: 'New request' });
const EDITED = { ...BLANK, url: 'http://api.test/orders' };

let stop: () => void = () => undefined;

beforeEach(() => {
    requestsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    stop = registerLooseRequests();
});

afterEach(() => {
    stop();
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

describe('requests saved nowhere across a restart (loose-requests-session)', () => {
    it('lays each one down on the session, under the id of its tab, with its edit', () => {
        openLooseRequest(ROOT_GROUP_ID, 'New request', () => EDITED);

        const [id, carried] = Object.entries(shellStore.getState().tabState)[0] ?? [];

        expect(id).toMatch(/^loose-request-/);
        expect(carried).toMatchObject({ before: { url: '' }, request: { url: EDITED.url } });
    });

    /** Spelling the bag out at every key cost 21 ms and 14 MB for a body of 5 MB. */
    it('reads no body to tell that an edit elsewhere leaves the bag as it was', () => {
        openLooseRequest(ROOT_GROUP_ID, 'New request', () => EDITED);

        const before = shellStore.getState().tabState;
        const spell = vi.spyOn(JSON, 'stringify');

        requestsStore.getState().setRequest(itemResource('Local', 'local', 'pedidos'), EDITED);

        expect(spell).not.toHaveBeenCalled();
        expect(shellStore.getState().tabState).toBe(before);
    });

    it('lays an edit down again, and nothing at all for the same request handed over twice', () => {
        openLooseRequest(ROOT_GROUP_ID, 'New request');

        const resource = Object.keys(requestsStore.getState().requests)[0] ?? '';
        const request = requestsStore.getState().requests[resource] ?? BLANK;
        const first = shellStore.getState().tabState;

        requestsStore.getState().setRequest(resource, request);

        expect(shellStore.getState().tabState).toBe(first);

        requestsStore.getState().setRequest(resource, { ...request, url: 'http://api.test/b' });

        expect(Object.values(shellStore.getState().tabState)[0]).toMatchObject({
            request: { url: 'http://api.test/b' },
        });
    });

    it('lets one go from the session once its tab let it go', () => {
        openLooseRequest(ROOT_GROUP_ID, 'New request');

        const resource = Object.keys(requestsStore.getState().requests)[0] ?? '';

        requestsStore.getState().forget(resource);

        expect(shellStore.getState().tabState).toEqual({});
    });

    it('brings each one back as it was left when a session lands, the edit still unsaved', () => {
        shellStore.setState({
            tabState: {
                [looseTabId('a1b2')]: { before: BLANK, request: EDITED, resource: RESOURCE },
                other: { something: 'else' },
            },
        });

        expect(requestsStore.getState().requests[RESOURCE]?.url).toBe(EDITED.url);
        expect(requestsStore.getState().pendings[RESOURCE]?.before?.url).toBe('');
    });

    it('brings back one never edited with nothing to save', () => {
        shellStore.setState({
            tabState: {
                [looseTabId('a1b2')]: { before: null, request: BLANK, resource: RESOURCE },
            },
        });

        expect(requestsStore.getState().requests[RESOURCE]?.name).toBe('New request');
        expect(requestsStore.getState().pendings[RESOURCE]).toBeUndefined();
    });

    it('leaves alone one the window already holds', () => {
        requestsStore.getState().setRequest(RESOURCE, { ...BLANK, name: 'Mine' });
        shellStore.setState({
            tabState: {
                [looseTabId('a1b2')]: { before: null, request: BLANK, resource: RESOURCE },
            },
        });

        expect(requestsStore.getState().requests[RESOURCE]?.name).toBe('Mine');
    });
});
