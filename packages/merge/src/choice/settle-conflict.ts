import type {
    Decide,
    Decision,
    MergeConflict,
    MergeResult,
    Side,
} from '../value/merge-conflict.js';

/** The answer of nobody: every question stays open. */
export const NO_DECISION: Decide = () => undefined;

function valueOf(side: Side): unknown {
    return side === null ? undefined : side.value;
}

/** Only free text can be written; a value or a row is picked from what the sides have. */
function writtenText(conflict: MergeConflict, decision: Decision): string | undefined {
    const writable = conflict.shape === 'text' || conflict.shape === 'file';

    return writable && 'text' in decision ? decision.text : undefined;
}

/**
 * A question either gets its answer or stays open. An open question still carries a value so the
 * rest of the merge goes on: the proposal of a text, else what ours has.
 */
export function settleConflict(conflict: MergeConflict, decide: Decide): MergeResult {
    const decision = decide(conflict);

    if (decision !== undefined && 'pick' in decision) {
        return { value: valueOf(conflict[decision.pick]), conflicts: [] };
    }

    const text = decision === undefined ? undefined : writtenText(conflict, decision);

    if (text !== undefined) {
        return { value: text, conflicts: [] };
    }

    return { value: conflict.proposed ?? valueOf(conflict.ours), conflicts: [conflict] };
}

/** Settles the one question a result carries, if it carries any. */
export function settleResult(result: MergeResult, decide: Decide): MergeResult {
    const [conflict] = result.conflicts;

    return conflict === undefined ? result : settleConflict(conflict, decide);
}
