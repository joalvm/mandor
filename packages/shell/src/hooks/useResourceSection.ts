import { shellStore } from '../shell-store.js';
import { selectSection } from '../selectors.js';
import { sectionKey } from '../sidebar/open-sections.js';

import { useShellStore } from './useShellStore.js';

/**
 * The section of a strip, tied to the resource under it instead of to the panel drawing it.
 * A panel is mounted and unmounted every time a tab is moved between groups; the resource is
 * what the reader thinks they left open on a section. A resource with more than one strip — a
 * request and its response — names the strip, and each keeps its own section for as long as
 * the resource is open.
 */
export function useResourceSection(
    resource: string,
    fallback: string,
    strip?: string,
): [string, (section: string) => void] {
    const key = sectionKey(resource, strip);
    const section = useShellStore((state) => selectSection(state, key));

    return [
        section ?? fallback,
        (next) => {
            shellStore.getState().setSection(key, next);
        },
    ];
}
