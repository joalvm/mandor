import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MenuContext, useMenuContext } from '../../../src/components/menu/menu-context.js';

describe('what a menu tells the lines it holds', () => {
    it('promises no check column when nobody asked for one', () => {
        const { result } = renderHook(() => useMenuContext());

        expect(result.current.checkable).toBe(false);
    });

    /** Outside a menu there is nothing to close first, so the command has nothing to wait for. */
    it('runs a chosen command at once when no menu is around the line', () => {
        const command = vi.fn();
        const { result } = renderHook(() => useMenuContext());

        result.current.choose(command);

        expect(command).toHaveBeenCalledOnce();
    });

    it('carries the checkable promise to every line under the menu', () => {
        const { result } = renderHook(() => useMenuContext(), {
            wrapper: ({ children }) => (
                <MenuContext.Provider value={{ checkable: true, choose: vi.fn() }}>
                    {children}
                </MenuContext.Provider>
            ),
        });

        expect(result.current.checkable).toBe(true);
    });
});
