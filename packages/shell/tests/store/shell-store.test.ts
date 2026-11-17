import { createFakeBridge } from '@mandor/ipc/testing';
import { EMPTY_UI_SESSION, ROOT_GROUP_ID, success, type ConflictSummary } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { selectTabs, type ShellStore } from '../../src/index.js';
import { createShellStore } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

/** The data half of the store: every field that is not an action. */
function dataOf(state: ShellStore): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(state).filter(([, value]) => typeof value !== 'function'),
    );
}

const ORIGIN = 'local';
const LOCAL = { id: 'local', name: 'Demo', kind: 'local' } as const;
const ONE = { id: 'one', kind: 'doc', resource: 'mandor://demo/payments/doc/one.md' };
const TWO = { id: 'two', kind: 'request', resource: 'mandor://demo/payments/doc/two.md' };
const ECHO = { id: 'echo', kind: 'connection', resource: 'mandor://demo/events/connection/echo' };

const CLASH: ConflictSummary = {
    at: '2026-10-07T10:00:00.000Z',
    entity: { area: 'doc', name: 'guia.md', workspaceId: 'payments' },
    id: '3fa94c01d27b8e65',
    name: 'guia.md',
    sections: [],
    source: 'merge',
};

/** A window draws these; a session naming a kind nobody registered comes back without it. */
const KINDS = ['connection', 'doc', 'request'];

let drawn: (() => void)[] = [];

beforeEach(() => {
    drawn = KINDS.map((id) =>
        declareTabKindSpec({ closable: true, icon: 'doc', id, title: () => id }),
    );
});

afterEach(() => {
    for (const stop of drawn) {
        stop();
    }

    vi.useRealTimers();
});

describe('the shell store', () => {
    it('replaces every data slice with the exact initial state on reset', () => {
        const store = createShellStore(createFakeBridge());

        store.getState().setOrigins([LOCAL]);
        store.getState().setActiveWorkspace('payments');
        store.getState().setPanels({ sidebarWidth: 300, contentSplit: 65, collapsedSections: [] });
        store.getState().openTab(ROOT_GROUP_ID, ONE);
        store.getState().reset();

        expect(dataOf(store.getState())).toEqual({
            conflicts: [],
            notices: [],
            noticesOpen: false,
            origins: [],
            activeOriginId: null,
            activeWorkspaceId: null,
            activeGroupId: ROOT_GROUP_ID,
            grid: { kind: 'leaf', id: ROOT_GROUP_ID, tabs: [], activeTab: null },
            maximizedGroupId: null,
            closedTabs: [],
            listingGroupId: null,
            openedTabId: null,
            recentTabs: {},
            recentWalk: null,
            resources: {},
            revealing: null,
            sections: {},
            tabState: {},
            panels: {
                sidebarWidth: 260,
                contentSplit: 50,
                collapsedSections: [],
                splits: {},
            },
            switchingOrigin: false,
            syncState: null,
        });
    });

    /**
     * Switching origins is two round trips to main. The window has to offer nothing to write
     * to in between, or a workspace created in that gap lands in the origin being replaced.
     */
    it('lets go of the origin, its workspace and its tabs on close, and keeps the known origins', () => {
        const store = createShellStore(createFakeBridge());

        store.setState({ activeOriginId: ORIGIN, activeWorkspaceId: 'events' });
        store.getState().setOrigins([LOCAL]);
        store.getState().setSyncState({ state: 'clean', busy: false });
        store.getState().setConflicts([CLASH]);
        store.getState().openTab(ROOT_GROUP_ID, ECHO);
        store.getState().closeOrigin();

        const state = store.getState();

        expect(state.activeOriginId).toBeNull();
        expect(state.activeWorkspaceId).toBeNull();
        expect(selectTabs(state)).toEqual([]);
        expect(state.resources).toEqual({});
        expect(state.origins).toEqual([LOCAL]);
        expect(state.syncState).toBeNull();
        expect(state.conflicts).toEqual([]);
    });

    it('reloads two debounced tabs in their saved order', async () => {
        vi.useFakeTimers();

        let saved = EMPTY_UI_SESSION;
        const bridge = createFakeBridge({
            session: {
                load: () => Promise.resolve(success(saved)),
                save: ({ session }) => {
                    saved = session;

                    return Promise.resolve(success({}));
                },
            },
        });
        const first = createShellStore(bridge);

        await first.getState().loadSession(ORIGIN);
        first.getState().setActiveWorkspace('payments');
        first.getState().openTab(ROOT_GROUP_ID, ONE);
        first.getState().openTab(ROOT_GROUP_ID, TWO);
        await vi.advanceTimersByTimeAsync(300);

        const second = createShellStore(bridge);

        await second.getState().loadSession(ORIGIN);

        expect(selectTabs(second.getState()).map((tab) => tab.id)).toEqual(['one', 'two']);
        expect(second.getState().activeWorkspaceId).toBe('payments');
    });

    /**
     * Closing the window a tenth of a second after moving a tab would bring back the arrangement
     * from before the move: the debounce that keeps typing cheap is longer than the goodbye.
     */
    it('saves the arrangement it is asked to save without waiting for the debounce', async () => {
        vi.useFakeTimers();

        let saved = EMPTY_UI_SESSION;
        const bridge = createFakeBridge({
            session: {
                load: () => Promise.resolve(success(saved)),
                save: ({ session }) => {
                    saved = session;

                    return Promise.resolve(success({}));
                },
            },
        });
        const first = createShellStore(bridge);

        await first.getState().loadSession(ORIGIN);
        first.getState().openTab(ROOT_GROUP_ID, ONE);
        first.getState().saveSession();

        const second = createShellStore(bridge);

        await second.getState().loadSession(ORIGIN);

        expect(selectTabs(second.getState()).map((tab) => tab.id)).toEqual(['one']);
    });

    /**
     * Switching origin cannot leave a save in flight: the debounce is cancelled and the write
     * is awaited, so the session of the origin being left lands before main moves on.
     */
    it('flushes the pending save before the switch and waits for it', async () => {
        vi.useFakeTimers();

        let saved = EMPTY_UI_SESSION;
        const bridge = createFakeBridge({
            session: {
                load: () => Promise.resolve(success(saved)),
                save: ({ session }) => {
                    saved = session;

                    return Promise.resolve(success({}));
                },
            },
        });
        const store = createShellStore(bridge);

        await store.getState().loadSession(ORIGIN);
        store.getState().openTab(ROOT_GROUP_ID, ONE);
        await store.getState().flushSession();

        expect(saved.grid).toMatchObject({
            tabs: [expect.objectContaining({ id: 'one' })],
        });
        expect(vi.getTimerCount()).toBe(0);
    });
});
