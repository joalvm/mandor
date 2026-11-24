import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
    TabsScopeProvider,
    useChooseSection,
    useOpenSection,
    useTabsOrientation,
} from '../../../src/components/tabs/tabs-scope.js';

const choose = vi.fn();

function Strip({ children }: PropsWithChildren) {
    return (
        <TabsScopeProvider value={{ choose, open: 'payload', orientation: 'vertical' }}>
            {children}
        </TabsScopeProvider>
    );
}

describe('the open section of a strip', () => {
    it('hands the strip the section that is open', () => {
        const { result } = renderHook(() => useOpenSection(), { wrapper: Strip });

        expect(result.current).toBe('payload');
    });

    it('opens another section through whoever holds the strip', () => {
        const { result } = renderHook(() => useChooseSection(), { wrapper: Strip });

        result.current('headers');

        expect(choose).toHaveBeenCalledWith('headers');
    });

    it('tells the list how the sections stand', () => {
        const { result } = renderHook(() => useTabsOrientation(), { wrapper: Strip });

        expect(result.current).toBe('vertical');
    });

    /** A panel mounted outside a strip has no section to show; failing beats guessing. */
    it('refuses to answer outside the strip that provides it', () => {
        expect(() => {
            renderHook(() => useOpenSection());
        }).toThrow('A section panel was drawn outside the strip it belongs to.');
    });
});
