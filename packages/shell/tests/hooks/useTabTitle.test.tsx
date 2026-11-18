import { MessagesProvider } from '@mandor/i18n';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useTabTitle } from '../../src/hooks/useTabTitle.js';
import type { TabKindSpec } from '../../src/tab/tab-kind-registry.js';

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'en' }}>{children}</MessagesProvider>;
}

function kind(overrides: Partial<TabKindSpec> = {}): TabKindSpec {
    return {
        closable: true,
        icon: 'doc',
        id: 'sample',
        title: (resource) => resource,
        ...overrides,
    };
}

describe('the title of one drawn tab', () => {
    it('is the name its kind gives the resource', () => {
        const { result } = renderHook(() => useTabTitle(kind(), 'Payments'), { wrapper: Wrapper });

        expect(result.current).toBe('Payments');
    });

    it('says untitled for a thing whose name is empty', () => {
        const { result } = renderHook(() => useTabTitle(kind(), ''), { wrapper: Wrapper });

        expect(result.current).toBe('Untitled');
    });

    it('shows no name while the kind has not read the thing yet', () => {
        const { result } = renderHook(() => useTabTitle(kind({ title: () => null }), 'x'), {
            wrapper: Wrapper,
        });

        expect(result.current).toBe('');
    });

    it('reads its title again when the kind says the titles moved', () => {
        let name = 'First';
        let notify = (): void => undefined;
        const spec = kind({
            subscribeTitles: (onChange) => {
                notify = onChange;

                return () => undefined;
            },
            title: () => name,
        });
        const { result } = renderHook(() => useTabTitle(spec, 'r'), { wrapper: Wrapper });

        expect(result.current).toBe('First');

        name = 'Second';
        act(() => {
            notify();
        });

        expect(result.current).toBe('Second');
    });

    it('stops listening to the kind when the tab goes', () => {
        const stop = vi.fn();
        const spec = kind({ subscribeTitles: () => stop });
        const { unmount } = renderHook(() => useTabTitle(spec, 'r'), { wrapper: Wrapper });

        unmount();

        expect(stop).toHaveBeenCalledOnce();
    });
});
