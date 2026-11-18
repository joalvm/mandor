import { failure, success, type ConflictSummary } from '@mandor/ipc';
import { bridge, conflictResource, shellStore, tabKindOf } from '@mandor/shell';
import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ConflictTabKind } from '../src/index.js';
import { conflictDrafts } from '../src/lib/conflict-drafts.js';
import { forgetDrafts } from './support/conflict-fixtures.js';

const CLASH: ConflictSummary = {
    at: '2026-10-07T10:00:00.000Z',
    entity: { area: 'collections', path: 'users/get', workspaceId: 'payments' },
    id: 'aaaaaaaaaaaaaaaa',
    name: 'Get users',
    sections: ['headers'],
    source: 'merge',
};
const RESOURCE = conflictResource('team', 'payments', CLASH.id);

let unregister: () => void = () => undefined;

beforeEach(() => {
    forgetDrafts();
    shellStore.getState().reset();
    unregister = render(<ConflictTabKind />).unmount;
});

afterEach(() => {
    unregister();
    shellStore.getState().reset();
    vi.restoreAllMocks();
});

describe('the clash tab kind (conflict-tab-kind, holds-conflict)', () => {
    it('is closable, with the glyph of a warning', () => {
        expect(tabKindOf('conflict').closable).toBe(true);
        expect(tabKindOf('conflict').icon).toBe('warning');
    });

    it('titles the tab «Conflicts», whatever clashed: the name of it is the title inside', () => {
        expect(tabKindOf('conflict').title(RESOURCE, translatorIn())).toBe('Conflicts');

        shellStore.getState().setConflicts([CLASH]);

        expect(tabKindOf('conflict').title(RESOURCE, translatorIn())).toBe('Conflicts');
    });

    it('lets a tab with nothing answered close without asking', async () => {
        await expect(tabKindOf('conflict').beforeClose?.('conflict:a')).resolves.toBe(true);
    });

    it('asks before a tab with answers goes, and lets go of them when it does', async () => {
        conflictDrafts.getState().choose('conflict:a', 'method', { pick: 'ours' });

        const answer = tabKindOf('conflict').beforeClose?.('conflict:a');

        conflictDrafts.getState().answerLeave('conflict:a', true);
        await expect(answer).resolves.toBe(true);

        tabKindOf('conflict').release?.('conflict:a', RESOURCE);

        expect(conflictDrafts.getState().hasDraft('conflict:a')).toBe(false);
    });

    it('holds a link only to a clash the open origin keeps, in that workspace', async () => {
        vi.spyOn(bridge.conflict, 'list').mockResolvedValue(success([CLASH]));
        const holds = tabKindOf('conflict').holds;

        await expect(holds?.('payments', CLASH.id)).resolves.toBe(true);
        await expect(holds?.('other', CLASH.id)).resolves.toBe(false);
        await expect(holds?.('payments', 'ffffffffffffffff')).resolves.toBe(false);
    });

    it('holds nothing when the list cannot be read', async () => {
        vi.spyOn(bridge.conflict, 'list').mockResolvedValue(failure('unknown', 'gone'));

        await expect(tabKindOf('conflict').holds?.('payments', CLASH.id)).resolves.toBe(false);
    });
});
