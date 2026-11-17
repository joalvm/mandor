import { useMessages } from '@mandor/i18n';

import { useGroupGrid } from '../../grid/group-grid-scope.js';
import { shellStore } from '../../shell-store.js';
import type { TabTrailingAction } from '../tab-strip/TabTrailing.js';

type TrailingOf = {
    closable: boolean;
    groupId: string;
    pinned: boolean;
    tabId: string;
};

/**
 * A pinned tab offers to let go of its pin where the close would be, and keeps offering it while
 * nothing points at it: the pin is what says the tab is pinned. Closing a pinned tab is asked for
 * by name, from its menu or its keys. The close of any other tab, the one in front included, is
 * only there while the tab is aimed at.
 */
export function useTrailingAction({
    closable,
    groupId,
    pinned,
    tabId,
}: TrailingOf): TabTrailingAction | undefined {
    const messages = useMessages('shell');
    const { onCloseTab } = useGroupGrid();

    if (pinned) {
        const run = () => {
            shellStore.getState().unpinTab(tabId);
        };

        return { icon: 'pinned', label: messages('unpinTab'), rests: true, run };
    }

    if (!closable) {
        return undefined;
    }

    return {
        icon: 'close',
        label: messages('closeTab'),
        rests: false,
        run: () => {
            onCloseTab(groupId, tabId);
        },
    };
}
