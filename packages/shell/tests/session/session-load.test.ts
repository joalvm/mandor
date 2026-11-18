import { EMPTY_UI_SESSION, ROOT_GROUP_ID, success, type Result, type UiSession } from '@mandor/ipc';
import { createFakeBridge } from '@mandor/ipc/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { createShellStore } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const ORIGIN = 'local';
const ONE = 'mandor://demo/payments/doc/one.md';
const SETTINGS = 'mandor://demo/payments/doc/settings.md';
const SAVED_TAB = { id: 'one', kind: 'doc', resource: ONE };
const OPENED_TAB = { id: 'settings', kind: 'doc', resource: SETTINGS };

const SESSION: UiSession = {
    ...EMPTY_UI_SESSION,
    activeWorkspaceId: 'payments',
    grid: { kind: 'leaf', id: ROOT_GROUP_ID, tabs: [SAVED_TAB], activeTab: SAVED_TAB.id },
    tabState: { one: { draft: 'saved' } },
};

let unregister = (): void => undefined;

afterEach(() => {
    unregister();
});

/** A session that main hands over only when the test says so, the way a slow disk does. */
function storeOnLateSession(): {
    api: ReturnType<typeof createShellStore>;
    land: (session: UiSession) => void;
} {
    let land: (session: UiSession) => void = () => undefined;
    // The executor runs before the constructor returns: `land` is the resolver from here on.
    const answer = new Promise<Result<UiSession>>((resolve) => {
        land = (session) => {
            resolve(success(session));
        };
    });
    const api = createShellStore(createFakeBridge({ session: { load: () => answer } }));

    return { api, land };
}

function drawsDocs(): () => void {
    return declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'doc',
        title: () => 'One',
    });
}

const BOTH_OPEN = {
    kind: 'leaf',
    id: ROOT_GROUP_ID,
    tabs: [SAVED_TAB, OPENED_TAB],
    activeTab: OPENED_TAB.id,
};

describe('the session that arrives after the window has started taking clicks', () => {
    /** The window draws its buttons before main has even opened the origin. */
    it('keeps the tab opened before any origin was open, in front of what it restores', async () => {
        unregister = drawsDocs();

        const { api, land } = storeOnLateSession();

        api.getState().openTab(api.getState().activeGroupId, OPENED_TAB);
        api.getState().setTabState({ settings: { section: 'language' } });

        const loading = api.getState().loadSession(ORIGIN);

        land(SESSION);
        await loading;

        expect(api.getState().grid).toEqual(BOTH_OPEN);
        expect(api.getState().resources).toEqual({
            [ONE]: { missing: false, tabs: ['one'] },
            [SETTINGS]: { missing: false, tabs: ['settings'] },
        });
        expect(api.getState().tabState).toEqual({
            one: { draft: 'saved' },
            settings: { section: 'language' },
        });
    });

    it('keeps the tab opened while the session was on its way', async () => {
        unregister = drawsDocs();

        const { api, land } = storeOnLateSession();

        api.setState({ activeOriginId: ORIGIN });

        const loading = api.getState().loadSession(ORIGIN);

        api.getState().openTab(api.getState().activeGroupId, OPENED_TAB);
        land(SESSION);
        await loading;

        expect(api.getState().grid).toEqual(BOTH_OPEN);
    });

    /** Reloading the origin the window is in, after emptying it, says what is left of it. */
    it('replaces the tabs of the origin it reloads', async () => {
        unregister = drawsDocs();

        const { api, land } = storeOnLateSession();

        api.setState({ activeOriginId: ORIGIN });
        api.getState().openTab(api.getState().activeGroupId, OPENED_TAB);
        api.getState().setTabState({ settings: { section: 'language' } });

        const loading = api.getState().loadSession(ORIGIN);

        land(SESSION);
        await loading;

        expect(api.getState().grid).toEqual(SESSION.grid);
        expect(api.getState().tabState).toEqual(SESSION.tabState);
    });
});
