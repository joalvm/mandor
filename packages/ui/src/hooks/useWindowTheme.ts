import { useSyncExternalStore } from 'react';

import { watchWindowTheme, windowTheme, type WindowTheme } from '../editor/window-theme.js';

function subscribe(onChange: () => void): () => void {
    return watchWindowTheme(onChange);
}

/**
 * The theme the window is drawn in, and a new render each time it changes. For what is painted
 * once with the colours of the theme and not by the stylesheets, like a picture: the stylesheets
 * follow the theme by themselves, and a picture has to be painted again.
 */
export function useWindowTheme(): WindowTheme {
    return useSyncExternalStore(subscribe, windowTheme);
}
