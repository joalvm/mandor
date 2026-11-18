import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferencesProvider } from '../../src/preferences-context.js';
import { useAppliedTheme } from '../../src/theme/useAppliedTheme.js';
import { systemPrefering } from './system-appearance.js';

function Wrapper({ children }: PropsWithChildren) {
    return <PreferencesProvider>{children}</PreferencesProvider>;
}

function choose(values: Record<string, string>): void {
    window.localStorage.setItem('mandor.preferences', JSON.stringify(values));
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe('the theme the window is drawn in', () => {
    it('is the day theme while the system looks light and the night one when it turns dark', () => {
        const { setDark } = systemPrefering(false);

        choose({
            'appearance.themeDay': 'light-contrast',
            'appearance.themeNight': 'dark-contrast',
        });

        const { result } = renderHook(() => useAppliedTheme(), { wrapper: Wrapper });

        expect(result.current).toEqual({ source: 'system', theme: 'light-contrast' });

        act(() => {
            setDark(true);
        });

        expect(result.current).toEqual({ source: 'system', theme: 'dark-contrast' });
    });

    it('holds the manual theme when the system changes its mind', () => {
        const { setDark } = systemPrefering(false);

        choose({ 'appearance.themeManual': 'dark-contrast', 'appearance.themeMode': 'manual' });

        const { result } = renderHook(() => useAppliedTheme(), { wrapper: Wrapper });

        expect(result.current).toEqual({ source: 'dark', theme: 'dark-contrast' });

        act(() => {
            setDark(true);
        });

        expect(result.current).toEqual({ source: 'dark', theme: 'dark-contrast' });
    });

    it('stops listening to the system when the window goes', () => {
        const { query } = systemPrefering(false);
        const added = vi.spyOn(query, 'addEventListener');
        const removed = vi.spyOn(query, 'removeEventListener');
        const { unmount } = renderHook(() => useAppliedTheme(), { wrapper: Wrapper });

        unmount();

        expect(added).toHaveBeenCalledOnce();
        expect(removed).toHaveBeenCalledExactlyOnceWith('change', added.mock.calls[0]?.[1]);
    });
});
