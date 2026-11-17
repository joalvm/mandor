import type { ConflictSummary } from '@mandor/ipc';
import { createFakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it } from 'vitest';

import { selectConflictFor, selectConflicts } from '../src/index.js';
import { createShellStore } from '../src/shell-store.js';

function clash(id: string, entity: ConflictSummary['entity']): ConflictSummary {
    return { at: '2026-10-07T10:00:00.000Z', entity, id, name: id, sections: [], source: 'merge' };
}

const DOC = clash('aaaaaaaaaaaaaaaa', { area: 'doc', name: 'guia.md', workspaceId: 'payments' });
const ITEM = clash('bbbbbbbbbbbbbbbb', {
    area: 'collections',
    path: 'users/get',
    workspaceId: 'payments',
});

describe('the clashes the window knows about (conflicts.slice)', () => {
    it('starts with none, always the same empty list', () => {
        const state = createShellStore(createFakeBridge()).getState();

        expect(selectConflicts(state)).toEqual([]);
        expect(selectConflicts(state)).toBe(selectConflicts(createShellStore().getState()));
    });

    it('holds the list main gave it, as its own copy', () => {
        const store = createShellStore(createFakeBridge());
        const given = [DOC, ITEM];

        store.getState().setConflicts(given);
        given.pop();

        expect(selectConflicts(store.getState())).toEqual([DOC, ITEM]);
    });

    it('finds the clash an entity is part of', () => {
        const store = createShellStore(createFakeBridge());

        store.getState().setConflicts([DOC, ITEM]);

        expect(
            selectConflictFor(store.getState(), {
                area: 'doc',
                name: 'guia.md',
                workspaceId: 'payments',
            }),
        ).toBe(DOC);
        expect(
            selectConflictFor(store.getState(), {
                area: 'collections',
                path: 'users/get',
                workspaceId: 'payments',
            }),
        ).toBe(ITEM);
    });

    it('finds nothing for an entity that does not clash, or that only shares a name', () => {
        const store = createShellStore(createFakeBridge());

        store.getState().setConflicts([DOC]);

        expect(
            selectConflictFor(store.getState(), {
                area: 'doc',
                name: 'otra.md',
                workspaceId: 'payments',
            }),
        ).toBeUndefined();
        expect(
            selectConflictFor(store.getState(), {
                area: 'doc',
                name: 'guia.md',
                workspaceId: 'events',
            }),
        ).toBeUndefined();
        expect(
            selectConflictFor(store.getState(), { area: 'workspace', workspaceId: 'payments' }),
        ).toBeUndefined();
    });
});
