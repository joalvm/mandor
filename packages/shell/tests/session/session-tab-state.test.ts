import { createFakeBridge } from '@mandor/ipc/testing';
import { EMPTY_UI_SESSION, ROOT_GROUP_ID, success, type UiSession } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { saveOnClose } from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';

const ORIGIN = 'local';
const DRAFT = { payload: 'hola' };

const SESSION_WITHOUT_TAB_STATE: UiSession = {
    version: 2,
    activeWorkspaceId: null,
    activeGroupId: ROOT_GROUP_ID,
    grid: { kind: 'leaf', id: ROOT_GROUP_ID, tabs: [], activeTab: null },
    panels: { ...EMPTY_UI_SESSION.panels },
};

const SESSION_WITH_TAB_STATE: UiSession = {
    ...SESSION_WITHOUT_TAB_STATE,
    tabState: { 'conn-1': DRAFT },
};

function storeOf(over: Parameters<typeof createFakeBridge>[0]) {
    return createShellStore(createFakeBridge(over));
}

describe('the state each tab holds beyond its arrangement', () => {
    it('travels to the session the window writes when it goes away', () => {
        const written: { session: UiSession }[] = [];
        const store = storeOf({
            session: {
                save: (input: { session: UiSession }) => {
                    written.push(input);

                    return Promise.resolve(success({}));
                },
            },
        });

        store.setState({ activeOriginId: ORIGIN });

        const stop = saveOnClose(store);

        store.getState().setTabState({ 'conn-1': DRAFT });
        expect(store.getState().tabState).toEqual({ 'conn-1': DRAFT });

        window.dispatchEvent(new Event('pagehide'));

        expect(written[0]?.session.tabState).toEqual({ 'conn-1': DRAFT });

        stop();
    });

    it('comes back when the origin opens', async () => {
        const store = storeOf({
            session: {
                load: () => Promise.resolve(success(SESSION_WITH_TAB_STATE)),
            },
        });

        await store.getState().loadSession(ORIGIN);

        expect(store.getState().tabState).toEqual({ 'conn-1': DRAFT });
    });

    it('is an empty bag when the file the origin saved has none', async () => {
        const store = storeOf({
            session: {
                load: () => Promise.resolve(success(SESSION_WITHOUT_TAB_STATE)),
            },
        });

        await store.getState().loadSession(ORIGIN);

        expect(store.getState().tabState).toEqual({});
    });

    it('is dropped with the origin being left, before another one opens', () => {
        const store = storeOf({});

        store.setState({ activeOriginId: ORIGIN });
        store.getState().setTabState({ 'conn-1': DRAFT });

        store.getState().closeOrigin();

        expect(store.getState().tabState).toEqual({});
    });
});
