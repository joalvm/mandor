import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DocOpenContext, useDocOpen } from '../src/hooks/useDocOpen.js';

describe('how the surface around a doc opens a resource', () => {
    it('is nothing where no surface offered to', () => {
        const { result } = renderHook(() => useDocOpen());

        expect(result.current).toBeNull();
    });

    it('is the way the surface around offered', () => {
        const open = vi.fn();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <DocOpenContext.Provider value={open}>{children}</DocOpenContext.Provider>
        );
        const { result } = renderHook(() => useDocOpen(), { wrapper });

        result.current?.('mandor://local-apis/events/doc/readme.md', true);

        expect(open).toHaveBeenCalledWith('mandor://local-apis/events/doc/readme.md', true);
    });
});
