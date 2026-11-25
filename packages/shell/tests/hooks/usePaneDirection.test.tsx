import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePaneDirection } from '../../src/hooks/usePaneDirection.js';
import { paneLayoutStore, togglePaneLayout } from '../../src/index.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    paneLayoutStore.setState(paneLayoutStore.getInitialState());
});

describe('reading how the halves of a tab stand', () => {
    it('sets them side by side where they fit, and one over the other once the layout turns', () => {
        const { result } = renderHook(() => usePaneDirection());

        expect(result.current).toBe('fit');

        act(() => {
            togglePaneLayout();
        });

        expect(result.current).toBe('column');
    });
});
