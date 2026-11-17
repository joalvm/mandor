import { describe, expect, it } from 'vitest';

import type { ClosedTab } from '../../src/tab/closed-tabs.js';
import { listedTabs } from '../../src/tab/tab-list.js';
import type { Tab } from '../../src/tab/tab.js';

function tab(id: string, pinned?: true): Tab {
    const plain = { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };

    return pinned === undefined ? plain : { ...plain, pinned };
}

function gone(id: string): ClosedTab {
    return { groupId: 'root', index: 0, tab: tab(id) };
}

const TITLES: Record<string, string> = {
    login: 'Login flow',
    logout: 'Logout',
    orders: 'Orders',
    users: 'User list',
};

function names(open: readonly Tab[], closed: readonly ClosedTab[], query: string): string[] {
    return listedTabs(open, closed, query, (each) => TITLES[each.id] ?? each.id).map(
        (line) => `${line.closed ? 'closed' : 'open'}:${line.tab.id}`,
    );
}

describe('what the list of tabs of a group offers', () => {
    it('lists the open tabs in strip order, then what left the window and is not back', () => {
        const open = [tab('orders'), tab('users')];

        expect(names(open, [gone('login'), gone('users')], '')).toEqual([
            'open:orders',
            'open:users',
            'closed:login',
        ]);
    });

    it('narrows both by what was typed, word initials included', () => {
        const open = [tab('orders'), tab('login')];

        expect(names(open, [gone('logout')], 'log')).toEqual(['open:login', 'closed:logout']);
        expect(names(open, [], 'lf')).toEqual(['open:login']);
    });

    it('keeps the pinned on top, also when narrowed', () => {
        const open = [tab('login'), tab('logout', true)];

        expect(names(open, [], 'log')).toEqual(['open:logout', 'open:login']);
    });
});
