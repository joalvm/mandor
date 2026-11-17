import { vi } from 'vitest';

/** A system that prefers `dark` or not, and a way to change its mind the way an operating system does. */
export function systemPrefering(initial: boolean) {
    const query = Object.assign(new EventTarget(), {
        addListener: () => undefined,
        matches: initial,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        removeListener: () => undefined,
    });

    vi.spyOn(window, 'matchMedia').mockImplementation(() => query);

    return {
        query,
        setDark: (dark: boolean) => {
            query.matches = dark;
            query.dispatchEvent(new Event('change'));
        },
    };
}
