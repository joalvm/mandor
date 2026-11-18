import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useShellStore } from '../../src/hooks/useShellStore.js';
import { shellStore } from '../../src/shell-store.js';

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    shellStore.getState().reset();
});

describe('reading the store of the window', () => {
    it('answers with what the selector picks out of the state', () => {
        const { result } = renderHook(() => useShellStore((state) => state.activeWorkspaceId));

        expect(result.current).toBeNull();
    });

    it('draws again when what the selector picks changes', () => {
        const { result } = renderHook(() => useShellStore((state) => state.activeWorkspaceId));

        act(() => {
            shellStore.getState().setActiveWorkspace('payments');
        });

        expect(result.current).toBe('payments');
    });

    it('does not draw again for a change it did not pick', () => {
        let draws = 0;

        renderHook(() => {
            draws += 1;

            return useShellStore((state) => state.switchingOrigin);
        });

        const before = draws;

        act(() => {
            shellStore.getState().setSyncState({ busy: false, state: 'clean' });
        });

        expect(draws).toBe(before);
    });
});
