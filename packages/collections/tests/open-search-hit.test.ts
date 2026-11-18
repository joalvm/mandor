import { selectTabs, shellStore } from '@mandor/shell';
import { declareTabKindSpec } from '@mandor/shell/testing/tab-kind';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openSearchHit } from '../src/search/open-search-hit.js';
import type { SearchHit } from '../src/search/search-workspace.js';

const MOVED = 'mandor://local/events/item/nuevo/guia.md';

const HIT: SearchHit = {
    matched: 'name',
    name: 'Guía',
    resource: MOVED,
    source: 'doc',
    tags: [],
    trail: '',
};

let unregister: () => void;

beforeEach(() => {
    unregister = declareTabKindSpec({
        closable: true,
        icon: 'doc',
        id: 'item',
        title: () => 'Guía',
    });
    shellStore.getState().reset();
});

afterEach(() => {
    shellStore.getState().reset();
    unregister();
});

describe('a hit whose thing was moved while its tab was open', () => {
    it('brings that tab forward instead of opening a second one', () => {
        const { activeGroupId, openTab } = shellStore.getState();

        openTab(activeGroupId, { id: 'nacida-antes', kind: 'item', resource: MOVED });
        openTab(activeGroupId, {
            id: 'otra',
            kind: 'item',
            resource: 'mandor://local/events/item/b.md',
        });

        openSearchHit(HIT, false, vi.fn());

        const state = shellStore.getState();

        expect(selectTabs(state).map((tab) => tab.id)).toEqual(['nacida-antes', 'otra']);
    });
});
