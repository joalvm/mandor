import { ROOT_GROUP_ID } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { tabHistoryActionsFor } from '../../src/tab/tab-history-actions.js';
import { initialShellData } from '../../src/shell-data.js';
import type { UiSlice } from '../../src/ui.slice.js';

function tab(id: string) {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

/** A window with one group holding `ids`, `front` in front, and the actions over it. */
function windowWith(front: string, ...ids: string[]) {
    let state: UiSlice = {
        ...initialShellData(),
        grid: { activeTab: front, id: ROOT_GROUP_ID, kind: 'leaf', tabs: ids.map(tab) },
    };
    const relaid = vi.fn();
    const show = vi.fn();
    const actions = tabHistoryActionsFor(
        () => state,
        (partial) => {
            state = { ...state, ...partial };
        },
        relaid,
        show,
    );

    return { actions, read: () => state, relaid, show };
}

describe('the tabs the window remembers', () => {
    it('holds the order of use still during a walk and lets it go at the end', () => {
        const view = windowWith('c', 'a', 'b', 'c');

        view.actions.walkRecent(1, 'b');
        expect(view.show).toHaveBeenCalledWith(ROOT_GROUP_ID, 'b');
        expect(view.read().recentTabs).toEqual({ [ROOT_GROUP_ID]: ['c', 'a', 'b'] });
        view.actions.endRecentWalk();
        expect(view.read().recentWalk).toBeNull();
        view.actions.endRecentWalk();
        expect(view.read().recentWalk).toBeNull();
    });

    it('takes the last tab closed off the stack and asks for nothing when it is empty', () => {
        const view = windowWith('a', 'a');

        view.actions.reopenTab();
        expect(view.relaid).not.toHaveBeenCalled();
        view.read().closedTabs = [{ groupId: ROOT_GROUP_ID, index: 1, tab: tab('b') }];
        view.actions.reopenTab();
        expect(view.read().closedTabs).toEqual([]);
        expect(view.relaid).toHaveBeenCalledTimes(1);
    });
});
