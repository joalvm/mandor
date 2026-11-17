import { useTranslator } from '@mandor/i18n';
import { useCallback, useSyncExternalStore } from 'react';

import type { TabKindSpec } from '../tab/tab-kind-registry.js';
import { shownTitle } from '../tab/tab-title.js';
import type { Tab } from '../tab/tab.js';

/** The cleanup of a kind that never retitles: there was nothing to stop listening to. */
function NOTHING_TO_STOP(): void {
    return undefined;
}

/**
 * The title of one drawn tab. The kind stays the only one who knows how to spell it; this only
 * makes sure the tab is told to ask again when the answer changed.
 */
export function useTabTitle(kind: TabKindSpec, resource: Tab['resource']): string {
    const subscribe = useCallback(
        (onChange: () => void) => kind.subscribeTitles?.(onChange) ?? NOTHING_TO_STOP,
        [kind],
    );
    const translate = useTranslator();
    const read = useCallback(
        () => shownTitle(kind.title(resource, translate), translate),
        [kind, resource, translate],
    );

    return useSyncExternalStore(subscribe, read, read);
}
