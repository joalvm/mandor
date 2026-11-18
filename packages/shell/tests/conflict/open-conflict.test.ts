import type { ConflictSummary } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { conflictResource, conflictTabId } from '../../src/conflict/conflict-resource.js';
import { openConflict } from '../../src/conflict/open-conflict.js';
import {
    selectActiveTabId,
    selectGroupOfTab,
    selectResourceOfTab,
    selectTabs,
} from '../../src/selectors.js';
import { shellStore } from '../../src/shell-store.js';

const CLASH: ConflictSummary = {
    at: '2026-10-07T10:00:00.000Z',
    entity: { area: 'collections', path: 'users/get', workspaceId: 'payments' },
    id: 'aaaaaaaaaaaaaaaa',
    name: 'get',
    sections: ['method'],
    source: 'merge',
};

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'team' });
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('showing a clash from where it was noticed (open-conflict)', () => {
    it('opens the tab of the clash, named by its resource', () => {
        openConflict(CLASH);

        expect(selectGroupOfTab(shellStore.getState(), conflictTabId(CLASH.id))).not.toBeNull();
        expect(selectActiveTabId(shellStore.getState())).toBe(conflictTabId(CLASH.id));
    });

    it('opens it once however many times it is asked', () => {
        openConflict(CLASH);
        openConflict(CLASH);

        expect(
            selectTabs(shellStore.getState()).filter((tab) => tab.id === conflictTabId(CLASH.id)),
        ).toHaveLength(1);
        expect(conflictResource('team', 'payments', CLASH.id)).toContain(CLASH.id);
    });

    it('lets whoever asks find the resource of a tab by its id', () => {
        openConflict(CLASH);

        expect(selectResourceOfTab(shellStore.getState(), conflictTabId(CLASH.id))).toBe(
            conflictResource('team', 'payments', CLASH.id),
        );
        expect(selectResourceOfTab(shellStore.getState(), 'nothing')).toBeNull();
    });

    it('opens nothing for a clash that names no workspace', () => {
        openConflict({ ...CLASH, entity: { area: 'repo' } });

        expect(selectGroupOfTab(shellStore.getState(), conflictTabId(CLASH.id))).toBeNull();
    });
});
