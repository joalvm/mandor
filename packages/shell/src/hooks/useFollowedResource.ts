import { useCallback, useSyncExternalStore } from 'react';

import { useDeclared } from '../declare/useDeclared.js';
import { selectFrontTab } from '../selectors.js';
import { tabKindDeclarations } from '../tab/tab-kind-registry.js';
import { useShellStore } from './useShellStore.js';

/** The cleanup of a kind that holds nothing inside: there was nothing to stop listening to. */
function NOTHING_TO_STOP(): void {
    return undefined;
}

/**
 * What the lateral follows, as an explorer follows the editor in front: what the tab in front
 * has open inside it, when its kind says so — the message a connection composes — and otherwise
 * what the tab itself looks at. Nothing while no tab is open.
 */
export function useFollowedResource(): string | null {
    const front = useShellStore(selectFrontTab);
    const kind = useDeclared(tabKindDeclarations, front?.kind);
    const subscribe = useCallback(
        (onChange: () => void) => kind?.subscribeInside?.(onChange) ?? NOTHING_TO_STOP,
        [kind],
    );
    const read = useCallback(
        () => (front === null ? null : (kind?.inside?.(front.id) ?? null)),
        [front, kind],
    );
    const inside = useSyncExternalStore(subscribe, read, read);

    return inside ?? front?.resource ?? null;
}
