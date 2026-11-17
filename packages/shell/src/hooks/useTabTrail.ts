import { useCallback, useSyncExternalStore } from 'react';

import type { TabKindSpec } from '../tab/tab-kind-registry.js';
import type { Tab } from '../tab/tab.js';

/** The cleanup of a kind that never retitles: there was nothing to stop listening to. */
function NOTHING_TO_STOP(): void {
    return undefined;
}

/**
 * What holds the thing of one drawn tab, by name, outermost first with a slash between them. The
 * kind says the names; this only asks again when it says they moved, like the title does.
 */
export function useTabTrail(kind: TabKindSpec, resource: Tab['resource']): string {
    const subscribe = useCallback(
        (onChange: () => void) => kind.subscribeTitles?.(onChange) ?? NOTHING_TO_STOP,
        [kind],
    );
    const read = useCallback(() => (kind.trail?.(resource) ?? []).join(' / '), [kind, resource]);

    return useSyncExternalStore(subscribe, read, read);
}
