import { createContext, useContext } from 'react';

import type { ResourceIndex } from '../resource/resource-index.js';

/**
 * What every tab of the grid needs and the view cannot carry for it.
 *
 * A panel of the grid travels as data — an id, a kind, a resource — because that is what gets
 * serialized. Callbacks and the index of what is on disk are not data, so they arrive the other
 * way, through the tree, and the tab reads them wherever the view decided to mount it.
 */
export type GroupGridScope = {
    onCloseTab: (groupId: string, tabId: string) => void;
    resources: ResourceIndex;
};

export const GroupGridContext = createContext<GroupGridScope | null>(null);

export function useGroupGrid(): GroupGridScope {
    const scope = useContext(GroupGridContext);

    if (scope === null) {
        throw new Error('A tab of the grid was drawn outside the grid.');
    }

    return scope;
}
