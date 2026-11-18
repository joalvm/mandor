import type { Origin, OriginSyncState } from '@mandor/schema';

import type { OpenedOrigin } from '../origin/opened-origin.js';
import type { OriginAddRequest } from '../origin/origin-add.js';
import type { OriginCheck, OriginCheckRequest } from '../origin/origin-check.js';
import type { OriginEmptyRequest } from '../origin/origin-empty.js';
import type { OriginRemoveRequest } from '../origin/origin-remove.js';
import type { OriginRenameRequest } from '../origin/origin-rename.js';
import type { OriginStatePush } from '../origin/origin-state.js';
import type { OriginSwitchRequest } from '../origin/origin-switch.js';
import type { Empty, Result } from '../result/result.js';

/**
 * The origin as the renderer reaches it. The url it stored is clean —the token lives in the
 * store of the system— and no answer carries the directory of this machine the origin sits in.
 */
export type OriginArea = {
    add: (input: OriginAddRequest) => Promise<Result<Origin>>;
    /** Asks one remote origin for its refs; the answer is the state the table paints. */
    check: (input: OriginCheckRequest) => Promise<Result<OriginCheck>>;
    empty: (input: OriginEmptyRequest) => Promise<Result<Empty>>;
    list: () => Promise<Result<Origin[]>>;
    /** Forgets a remote origin and its copy on this machine; the local one is refused. */
    remove: (input: OriginRemoveRequest) => Promise<Result<Empty>>;
    rename: (input: OriginRenameRequest) => Promise<Result<Origin>>;
    /** Where the open origin stands against its remote: read once at start, then heard. */
    state: () => Promise<Result<OriginSyncState | null>>;
    /** The open origin started a step, finished one or changed state. */
    onStateChanged: (handler: (push: OriginStatePush) => void) => () => void;
    switch: (input: OriginSwitchRequest) => Promise<Result<OpenedOrigin>>;
};
