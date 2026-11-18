import type { CoreBridge, Empty, Result } from '@mandor/ipc';

import { fireAndForget } from '../fire-and-forget.js';
import type { ShellData } from '../shell-data.js';
import { sessionOf } from './session-projection.js';

const SAVE_DELAY_MS = 250;

export type SessionSaver = {
    cancel: () => void;
    /** Writes now and waits for the answer: switching origin cannot leave a save in flight. */
    flush: (state: ShellData) => Promise<Result<Empty> | null>;
    save: (state: ShellData) => void;
    schedule: (state: ShellData) => void;
};

export function createSessionSaver(mainBridge: CoreBridge): SessionSaver {
    let pending: ReturnType<typeof setTimeout> | undefined;

    const cancel = (): void => {
        if (pending !== undefined) {
            clearTimeout(pending);
            pending = undefined;
        }
    };

    const save = (state: ShellData): void => {
        cancel();

        // Main writes the session of the active origin. Without one there is nowhere to write.
        if (state.activeOriginId === null) {
            return;
        }

        fireAndForget(mainBridge.session.save({ session: sessionOf(state) }));
    };

    return {
        cancel,
        flush: (state) => {
            cancel();

            if (state.activeOriginId === null) {
                return Promise.resolve(null);
            }

            return mainBridge.session.save({ session: sessionOf(state) });
        },
        save,
        schedule: (state) => {
            cancel();

            if (state.activeOriginId === null) {
                return;
            }

            pending = setTimeout(() => {
                pending = undefined;
                save(state);
            }, SAVE_DELAY_MS);
        },
    };
}
