import type { GridNode } from '@mandor/ipc';
import { useCallback } from 'react';

import { fireAndForget } from '../fire-and-forget.js';
import type { ResourceIndex } from '../resource/resource-index.js';

import { useShellStore } from './useShellStore.js';

/** The arrangement of the window, and the five moves the view is allowed to report back. */
export type GridView = {
    activeGroupId: string;
    closeTab: (groupId: string, tabId: string) => void;
    focusGroup: (groupId: string) => void;
    grid: GridNode;
    maximizedGroupId: string | null;
    rearrangeGrid: (grid: GridNode, focused: string) => void;
    resizeGrid: (path: number[], index: number, delta: number) => void;
    resources: ResourceIndex;
    setActiveTab: (groupId: string, tabId: string | null) => void;
};

/**
 * Everything the grid of groups reads off the session, in one place and under one name.
 *
 * Each field is its own selector on purpose: a selector that built this object would hand back a
 * new identity on every change of the store and redraw the grid for a width the grid never looks
 * at. Nine subscriptions cost nothing and each one wakes only what it feeds.
 */
export function useGridView(): GridView {
    const requestCloseTab = useShellStore((state) => state.requestCloseTab);
    const closeTab = useCallback(
        (groupId: string, tabId: string) => {
            fireAndForget(requestCloseTab(groupId, tabId));
        },
        [requestCloseTab],
    );

    return {
        activeGroupId: useShellStore((state) => state.activeGroupId),
        closeTab,
        focusGroup: useShellStore((state) => state.focusGroup),
        grid: useShellStore((state) => state.grid),
        maximizedGroupId: useShellStore((state) => state.maximizedGroupId),
        rearrangeGrid: useShellStore((state) => state.rearrangeGrid),
        resizeGrid: useShellStore((state) => state.resizeGrid),
        resources: useShellStore((state) => state.resources),
        setActiveTab: useShellStore((state) => state.setActiveTab),
    };
}
