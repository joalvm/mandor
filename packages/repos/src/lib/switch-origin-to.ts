import { dropOriginState, settlePendingWrites, shellStore } from '@mandor/shell';

import type { AdoptOrigin } from './adopt-origin.js';
import { switchOrigin } from './switch-origin.js';

export type OriginSwitch = {
    adopt: AdoptOrigin;
    /** What the app is holding open on the origin being left. Nothing of it survives. */
    close?: () => Promise<void>;
};

/**
 * Switching origin, in the only order that is safe: what was typed and still waits for its pause
 * goes to disk first, into the origin it was typed in; what the app holds open is closed, because
 * none of it survives; the session of the origin being left is written and awaited;
 * the state it fed (every store scoped to the origin) is dropped; and only then the new origin opens and restores its own.
 *
 * Between the two round trips the window belongs to no origin, and every form still reachable
 * would be writing into the one being replaced. That gap is what the flag covers.
 */
export async function switchOriginTo(id: string, app: OriginSwitch): Promise<void> {
    const shell = shellStore.getState();
    const leaving = shell.activeOriginId;

    if (leaving === null || id === leaving || shell.switchingOrigin) {
        return;
    }

    shell.setSwitchingOrigin(true);

    try {
        await settlePendingWrites();
        await app.close?.();
        await shell.flushSession();
        dropOriginState();
        shellStore.getState().closeOrigin();

        const opened = await switchOrigin(id);

        if (opened.ok) {
            await app.adopt(id, opened.value);

            return;
        }

        // The state of the origin being left is already gone: its session brings it back.
        await shellStore.getState().loadSession(leaving);
    } finally {
        shellStore.getState().setSwitchingOrigin(false);
    }
}
