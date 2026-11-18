import { failure, success, type Result } from '@mandor/ipc';

import { activeOrigin } from './active-origin.js';

/** The origin every handler works against: its id names its secrets, its root holds its files. */
export type ActiveRepo = {
    id: string;
    root: string;
};

/**
 * The active origin, or the refusal of a window that is between origins. «Repo» is the word of
 * the code for what the interface calls the origin, and the id is what a secret is derived
 * from: a renderer never sends either of them.
 */
export function activeRepo(): Result<ActiveRepo> {
    const origin = activeOrigin();

    if (origin === null) {
        return failure('bad-request', 'no active origin');
    }

    return success({ id: origin.id, root: origin.root });
}
