import type { AppearanceSource } from '@mandor/ipc';
import type { ThemeId } from '@mandor/schema';
import { useSyncExternalStore } from 'react';

import { usePreferences } from '../preferences-context.js';
import { appearanceSourceOf, resolveTheme, themeChoiceOf } from './resolve-theme.js';

const DARK_SCHEME = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void): () => void {
    const query = window.matchMedia(DARK_SCHEME);

    query.addEventListener('change', onChange);

    return () => {
        query.removeEventListener('change', onChange);
    };
}

function systemIsDark(): boolean {
    return window.matchMedia(DARK_SCHEME).matches;
}

/** The theme the window is drawn in, and what main is asked to make the system be. */
export type AppliedTheme = {
    source: AppearanceSource;
    theme: ThemeId;
};

/**
 * The theme the preferences resolve to right now. While the system picks, the window follows its
 * appearance as it changes; the reader's own choice never depends on it.
 */
export function useAppliedTheme(): AppliedTheme {
    const { values } = usePreferences();
    const dark = useSyncExternalStore(subscribe, systemIsDark);
    const choice = themeChoiceOf(values);

    return { source: appearanceSourceOf(choice), theme: resolveTheme(choice, dark) };
}
