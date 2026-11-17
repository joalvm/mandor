import { ROOT_GROUP_ID } from '@mandor/ipc';
import { cleanup, act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useGridView } from '../../src/hooks/useGridView.js';
import { shellStore } from '../../src/index.js';

const DOC = 'mandor://demo/payments/doc/one.md';

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('useGridView', () => {
    it('reads the empty arrangement of a fresh session', () => {
        const view = renderHook(() => useGridView()).result.current;

        expect(view.activeGroupId).toBe(ROOT_GROUP_ID);
        expect(view.grid).toEqual({
            kind: 'leaf',
            id: ROOT_GROUP_ID,
            tabs: [],
            activeTab: null,
        });
        expect(view.maximizedGroupId).toBeNull();
        expect(view.resources).toEqual({});
    });

    it('follows the session as the grid of groups changes', () => {
        const { result } = renderHook(() => useGridView());
        let right = '';

        act(() => {
            shellStore.getState().openTab(ROOT_GROUP_ID, {
                id: 'one',
                kind: 'doc',
                resource: DOC,
            });
            right = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');
            shellStore.getState().focusGroup(right);
        });

        expect(result.current.activeGroupId).toBe(right);
        expect(result.current.grid.kind).toBe('branch');
        expect(result.current.resources).toEqual({ [DOC]: { missing: false, tabs: ['one'] } });
    });

    /** The view hands the session's own moves back, so calling one lands in the store. */
    it('closes a tab through the move the view handed over', () => {
        const { result } = renderHook(() => useGridView());

        act(() => {
            shellStore.getState().openTab(ROOT_GROUP_ID, {
                id: 'one',
                kind: 'doc',
                resource: DOC,
            });
            shellStore.getState().openTab(ROOT_GROUP_ID, {
                id: 'two',
                kind: 'doc',
                resource: 'mandor://demo/payments/doc/two.md',
            });
        });

        act(() => {
            result.current.closeTab(ROOT_GROUP_ID, 'two');
        });

        const group = result.current.grid;

        expect(group.kind === 'leaf' ? group.tabs.map((tab) => tab.id) : null).toEqual(['one']);
    });

    it('resizes a branch through the move the view handed over', () => {
        const { result } = renderHook(() => useGridView());

        act(() => {
            shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');
        });

        act(() => {
            result.current.resizeGrid([], 0, 15);
        });

        expect(result.current.grid).toMatchObject({ kind: 'branch', sizes: [65, 35] });
    });
});
