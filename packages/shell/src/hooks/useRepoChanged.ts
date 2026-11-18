import type { ChangedEntity } from '@mandor/schema';
import { useEffect, useEffectEvent } from 'react';

import { listenRepoChanges } from '../repo/repo-change-feed.js';

/**
 * Calls `onChange` with the entities that changed on disk without the window and that `match`
 * says are the ones this view shows. Nothing is called for a push that touches none of them, so
 * a view only reloads what was really replaced under it.
 *
 * `match` and `onChange` are read at the moment of the push: a view can pass them inline
 * without resubscribing on every draw.
 */
export function useRepoChanged(
    match: (entity: ChangedEntity) => boolean,
    onChange: (changes: ChangedEntity[]) => void,
): void {
    const heard = useEffectEvent((changes: ChangedEntity[]): void => {
        const mine = changes.filter(match);

        if (mine.length > 0) {
            onChange(mine);
        }
    });

    useEffect(
        () =>
            listenRepoChanges((changes) => {
                heard(changes);
            }),
        [],
    );
}
