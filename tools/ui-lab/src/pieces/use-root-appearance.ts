import { useSyncExternalStore } from 'react';

/** The attributes the appearance preferences write on the root, as the apps do. */
const ATTRIBUTES = ['data-theme', 'data-density', 'data-motion'];

/** What the system decides while a preference follows it. */
const QUERIES = ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)'];

function subscribe(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange);
    const queries = QUERIES.map((query) => matchMedia(query));

    observer.observe(document.documentElement, { attributeFilter: ATTRIBUTES, attributes: true });

    for (const query of queries) {
        query.addEventListener('change', onChange);
    }

    return () => {
        observer.disconnect();

        for (const query of queries) {
            query.removeEventListener('change', onChange);
        }
    };
}

function snapshot(): string {
    const root = document.documentElement;
    const written = ATTRIBUTES.map((name) => root.getAttribute(name) ?? '');
    const asked = QUERIES.map((query) => String(matchMedia(query).matches));

    return [...written, ...asked].join('|');
}

/**
 * The appearance the window is drawn in right now: the preferences written on the root and what
 * the system asks for. A piece that reads a computed value subscribes to it, so a token that
 * changes with the density or the theme is read again the moment it changes.
 */
export function useRootAppearance(): string {
    return useSyncExternalStore(subscribe, snapshot);
}
