import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePaneLayout } from '../../src/hooks/usePaneLayout.js';
import { paneLayoutStore, togglePaneLayout } from '../../src/index.js';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    paneLayoutStore.setState(paneLayoutStore.getInitialState());
});

describe('reading the layout of the panels', () => {
    it('draws anew with the layout a toggle leaves', () => {
        const { result } = renderHook(() => usePaneLayout());

        expect(result.current).toBe('vertical');

        act(() => {
            togglePaneLayout();
        });

        expect(result.current).toBe('horizontal');
    });
});
