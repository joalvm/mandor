import type { ConflictChangedPush } from '../conflict/conflict-changed.js';
import type { ConflictDetail, ConflictReadRequest } from '../conflict/conflict-detail.js';
import type { ConflictSummary } from '../conflict/conflict-summary.js';
import type {
    ConflictKeepMineRequest,
    ConflictResolveRequest,
} from '../conflict/conflict-resolve.js';
import type { Empty, Result } from '../result/result.js';

/**
 * The clashes the open origin keeps for a person. The window lists them, opens one with its
 * questions, answers one or keeps this copy as it is, and hears when the list changes.
 */
export type ConflictArea = {
    /** Every clash that still has a question left. One that has none is gone from the list. */
    list: () => Promise<Result<ConflictSummary[]>>;
    /** One clash with its questions, worked out again from the file as it is on disk now. */
    read: (input: ConflictReadRequest) => Promise<Result<ConflictDetail>>;
    /** Writes the answers of a clash and closes it. Answers missing for a question refuse it. */
    resolve: (input: ConflictResolveRequest) => Promise<Result<Empty>>;
    /** Closes a clash leaving this copy as it is. */
    keepMine: (input: ConflictKeepMineRequest) => Promise<Result<Empty>>;
    /** A clash was kept or went away: whoever shows the list asks again. */
    onChanged: (handler: (push: ConflictChangedPush) => void) => () => void;
};
