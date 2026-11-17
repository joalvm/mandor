import { fireAndForget, shellStore } from '@mandor/shell';
import { useEffect } from 'react';

import type { AdoptOrigin } from '../lib/adopt-origin.js';
import { listOrigins } from '../lib/list-origins.js';
import { switchOrigin } from '../lib/switch-origin.js';
import { useConflictFeed } from './useConflictFeed.js';
import { useOriginSyncState } from './useOriginSyncState.js';

async function openFirstOrigin(adopt: AdoptOrigin, alive: () => boolean): Promise<void> {
    const listed = await listOrigins();

    if (!listed.ok || !alive()) {
        return;
    }

    shellStore.getState().setOrigins(listed.value);

    const first = listed.value[0];

    if (first === undefined || shellStore.getState().activeOriginId !== null) {
        return;
    }

    const opened = await switchOrigin(first.id);

    if (opened.ok && alive()) {
        await adopt(first.id, opened.value);
    }
}

/**
 * Opens the origin the window starts in: `Local`, which main always lists first. The app
 * starts with one whether or not the user ever asked for it, so nothing here blocks the
 * window: a failure leaves whatever the app settles on when nothing opened. It also keeps the
 * state of the synchronization of whichever origin is open, and the clashes it holds for a person.
 *
 * What adopting an origin means is of the app. Both windows boot the same way, and only what
 * they do with the origin once it is open differs.
 */
export function useOriginBoot(adopt: AdoptOrigin): void {
    useOriginSyncState();
    useConflictFeed();

    useEffect(() => {
        let alive = true;

        fireAndForget(openFirstOrigin(adopt, () => alive));

        return () => {
            alive = false;
        };
    }, [adopt]);
}
