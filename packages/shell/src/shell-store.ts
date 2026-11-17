import type { CoreBridge, Empty, Result, UiSession } from '@mandor/ipc';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { bridge } from './bridge.js';
import { createSessionSaver, type SessionSaver } from './session/debounced-session-save.js';
import { groupActionsFor, type GroupActions } from './grid/group-actions.js';
import { stillOpen } from './grid/grid-leaf.js';
import { gridResized, resourceRemoved, type Layout } from './grid/grid-changes.js';
import { tabActionsFor, type TabActions } from './grid/tab-actions.js';
import { closeRequestsFor, type CloseRequests } from './tab/close-requests.js';
import { closedAfter, closedMoved, closedWithout } from './tab/closed-tabs.js';
import { recencyOf } from './tab/tab-recency.js';
import { tabHistoryActionsFor, type TabHistoryActions } from './tab/tab-history-actions.js';
import { moveResourceFor } from './resource/resource-move-action.js';
import { openSections } from './sidebar/open-sections.js';
import { loadSessionInto } from './session/session-load.js';
import { initialShellData, type ShellData } from './shell-data.js';
import { conflictsActionsFor, type ConflictsActions } from './conflicts.slice.js';
import { noticesActionsFor, type NoticesActions } from './notices.slice.js';
import { originsActionsFor, type OriginsActions } from './origins.slice.js';
import { initialLayout, tabStateActionsFor, type TabStateActions } from './ui.slice.js';
import type { Panels } from './grid/panels.js';

type ShellActions = CloseRequests &
    ConflictsActions &
    GroupActions &
    NoticesActions &
    OriginsActions &
    TabActions &
    TabHistoryActions &
    TabStateActions & {
        closeOrigin: () => void;
        /** Writes the session of the origin being left and waits for main to confirm it. */
        flushSession: () => Promise<Result<Empty> | null>;
        loadSession: (originId: string) => Promise<Result<UiSession>>;
        moveResource: (from: string, to: string) => void;
        removeResource: (resource: string) => void;
        resizeGrid: (path: number[], index: number, delta: number) => void;
        reset: () => void;
        saveSession: () => void;
        setActiveWorkspace: (workspaceId: string | null) => void;
        /** Moves one size of the window, leaving the rest of the arrangement as it was. */
        setPanels: (panels: Partial<Panels>) => void;
        setSection: (resource: string, section: string) => void;
    };

export type ShellStore = ShellActions & ShellData;
export type ShellStoreApi = StoreApi<ShellStore>;

function actionsFor(
    mainBridge: CoreBridge,
    set: ShellStoreApi['setState'],
    get: ShellStoreApi['getState'],
    saver: SessionSaver,
): ShellActions {
    const persist = (): void => {
        saver.schedule(get());
    };

    /**
     * Every move of a tab or a group goes through here, so none of them can skip the save, and
     * none can close a tab without it being remembered or show one without it being used.
     */
    const relaid = (change: (layout: Layout) => Layout): void => {
        set((state) => {
            const layout = change({ ...state });
            const walking = state.recentWalk !== null;

            return {
                ...layout,
                closedTabs: closedAfter(state.closedTabs, state.grid, state.resources, layout.grid),
                maximizedGroupId: stillOpen(layout.grid, state.maximizedGroupId),
                recentTabs: walking ? state.recentTabs : recencyOf(state.recentTabs, layout.grid),
            };
        });
        persist();
    };

    const moveResource = moveResourceFor(relaid);

    const actions: ShellActions = {
        ...closeRequestsFor(get),
        ...conflictsActionsFor(set),
        ...groupActionsFor(get, set, relaid),
        ...noticesActionsFor(set),
        ...originsActionsFor(set),
        ...tabActionsFor({
            grid: () => get().grid,
            opened: (openedTabId) => {
                set({ openedTabId });
            },
            pruneSections: () => {
                set((state) => ({ sections: openSections(state.sections, state.resources) }));
            },
            relaid,
        }),
        ...tabHistoryActionsFor(get, set, relaid, (groupId, tabId) => {
            actions.setActiveTab(groupId, tabId);
        }),
        ...tabStateActionsFor(set, persist),
        /**
         * Lets go of the origin the window was working in, leaving the list of known origins
         * and the panel widths alone. Switching to another one takes two round trips to main,
         * and until they land every form on screen would still be writing to the origin being
         * replaced: a workspace created in that gap lands in the old origin and disappears
         * from view.
         *
         * It does not schedule a save. The window is not being left in this state; it is
         * passing through it.
         */
        closeOrigin: () => {
            set({
                activeOriginId: null,
                activeWorkspaceId: null,
                closedTabs: [],
                conflicts: [],
                maximizedGroupId: null,
                openedTabId: null,
                recentTabs: {},
                recentWalk: null,
                sections: {},
                syncState: null,
                tabState: {},
                ...initialLayout(),
            });
        },
        loadSession: loadSessionInto(mainBridge, get, set),
        moveResource: (from, to) => {
            moveResource(from, to);
            set((state) => ({ closedTabs: closedMoved(state.closedTabs, from, to) }));
        },
        /** A file deleted under the app leaves its tabs open, marked as looking at nothing. */
        removeResource: (resource) => {
            relaid((layout) => resourceRemoved(layout, resource));
            set((state) => ({ closedTabs: closedWithout(state.closedTabs, resource) }));
        },
        resizeGrid: (path, index, delta) => {
            relaid((layout) => gridResized(layout, path, index, delta));
        },
        reset: () => {
            saver.cancel();
            set({ ...initialShellData(), ...actions }, true);
        },
        /** Writes what the window looks like right now, for whoever cannot wait for the debounce. */
        saveSession: () => {
            saver.save(get());
        },
        flushSession: () => saver.flush(get()),
        setActiveWorkspace: (activeWorkspaceId) => {
            set({ activeWorkspaceId });
            persist();
        },
        setPanels: (panels) => {
            set((state) => ({ panels: { ...state.panels, ...panels } }));
            persist();
        },
        /** The strip reports where the reader moved to, and the session keeps it for next time. */
        setSection: (resource, section) => {
            set((state) => ({ sections: { ...state.sections, [resource]: section } }));
            persist();
        },
    };

    return actions;
}

// store-scope: window — the session and the tabs are read again by `loadSession` on every switch.
export function createShellStore(mainBridge: CoreBridge = bridge): ShellStoreApi {
    return createStore<ShellStore>()((set, get) => {
        const saver = createSessionSaver(mainBridge);
        const actions = actionsFor(mainBridge, set, get, saver);

        return { ...initialShellData(), ...actions };
    });
}

export const shellStore = createShellStore();
