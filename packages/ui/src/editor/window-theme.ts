/** The themes the window is drawn in: each colour scheme, and its high-contrast variant. */
export const WINDOW_THEMES = ['dark', 'dark-contrast', 'light', 'light-contrast'] as const;

export type WindowTheme = (typeof WINDOW_THEMES)[number];

const PREFERS_DARK = '(prefers-color-scheme: dark)';

function isWindowTheme(value: string | undefined): value is WindowTheme {
    return WINDOW_THEMES.some((theme) => theme === value);
}

/**
 * The same decision the stylesheets make: the `data-theme` the window declares wins, and
 * before it declares one the operating system's preference does — reading it here is what
 * keeps the editor in step with the panel that holds it.
 */
export function windowTheme(): WindowTheme {
    const theme = document.documentElement.dataset['theme'];

    if (isWindowTheme(theme)) {
        return theme;
    }

    return window.matchMedia(PREFERS_DARK).matches ? 'dark' : 'light';
}

/**
 * Tells the theme each time it changes, and only then: the window can switch it through its
 * `data-theme`, and before it declares one the system can switch it under the window.
 */
export function watchWindowTheme(onChange: (theme: WindowTheme) => void): () => void {
    const system = window.matchMedia(PREFERS_DARK);
    const state = { theme: windowTheme() };
    const check = (): void => {
        const theme = windowTheme();

        if (theme === state.theme) {
            return;
        }

        state.theme = theme;
        onChange(theme);
    };

    const observer = new MutationObserver(check);

    observer.observe(document.documentElement, {
        attributeFilter: ['data-theme'],
        attributes: true,
    });
    system.addEventListener('change', check);

    return () => {
        observer.disconnect();
        system.removeEventListener('change', check);
    };
}
