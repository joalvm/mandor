import type { ChangedEntity } from '@mandor/schema';

import { bridge } from '../bridge.js';

type Listener = (changes: ChangedEntity[]) => void;

const listeners = new Set<Listener>();
let release: (() => void) | undefined;

/**
 * Hears the entities that changed on disk without the window. The bridge is subscribed once for
 * all the listeners, by the first one that arrives, and let go of by the last one that leaves:
 * a window with nobody showing files holds no subscription at all.
 */
export function listenRepoChanges(listener: Listener): () => void {
    listeners.add(listener);

    release ??= bridge.repo.onChanged((push) => {
        for (const each of [...listeners]) {
            each(push.changes);
        }
    });

    return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
            release?.();
            release = undefined;
        }
    };
}
