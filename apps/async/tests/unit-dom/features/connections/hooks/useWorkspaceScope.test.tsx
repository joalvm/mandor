import { shellStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useWorkspaceScope } from '../../../../../src/renderer/features/connections/hooks/useWorkspaceScope.js';

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('where the window is working', () => {
    it('is nowhere while no origin is open', () => {
        const { result } = renderHook(() => useWorkspaceScope());

        expect(result.current).toBeNull();
    });

    it('is nowhere while an origin is open without a workspace', () => {
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: null });

        const { result } = renderHook(() => useWorkspaceScope());

        expect(result.current).toBeNull();
    });

    it('is the workspace of the open origin', () => {
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });

        const { result } = renderHook(() => useWorkspaceScope());

        expect(result.current).toEqual({ workspaceId: 'events' });
    });

    it('keeps its identity while the workspace stays and follows the window to another', () => {
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });

        const { rerender, result } = renderHook(() => useWorkspaceScope());
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);

        act(() => {
            shellStore.setState({ activeWorkspaceId: 'billing' });
        });

        expect(result.current).toEqual({ workspaceId: 'billing' });
    });
});
