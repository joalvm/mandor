import { NO_DECISION, settleConflict } from '../choice/settle-conflict.js';
import {
    conflictOf,
    type Decide,
    type MergeConflict,
    type MergeInput,
    type MergeResult,
    type MergeStep,
} from '../value/merge-conflict.js';
import { mergeOrderedSet } from './merge-ordered-set.js';
import { keyedRows, type IdentifiedRows } from './row-identity.js';

/**
 * A row merges field by field, so two sides that touched different fields both get in. One
 * field both changed makes the whole row the question: the user picks a row, not half of one.
 * The fields are merged without answers for that reason: the only question is about the row.
 */
function mergeRow(input: MergeInput, merge: MergeStep, decide: Decide): MergeResult {
    const merged = merge({ ...input, decide: NO_DECISION });

    if (merged.conflicts.length === 0) {
        return merged;
    }

    return settleConflict(conflictOf('row', input), decide);
}

/**
 * Lists of objects the file keeps as one row per item: headers, query, form fields, variables.
 * Rows are matched by identity and occurrence, never by position. The order is ours; a row
 * theirs added goes after the neighbour it had, or first.
 */
export function mergeRows(
    rows: IdentifiedRows,
    context: MergeInput,
    merge: MergeStep,
): MergeResult {
    const base = keyedRows(rows.base, rows.field);
    const ours = keyedRows(rows.ours, rows.field);
    const theirs = keyedRows(rows.theirs, rows.field);
    const order = mergeOrderedSet([], [...ours.keys()], [...theirs.keys()]);
    const value: unknown[] = [];
    const conflicts: MergeConflict[] = [];

    for (const key of order) {
        const input = {
            base: base.get(key),
            ours: ours.get(key),
            theirs: theirs.get(key),
            path: [...context.path, key],
            decide: context.decide,
        };
        const merged = mergeRow(input, merge, context.decide);

        conflicts.push(...merged.conflicts);

        if (merged.value !== undefined) {
            value.push(merged.value);
        }
    }

    return { value, conflicts };
}
