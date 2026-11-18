import { askAboutValue } from '../value/ask-about-value.js';
import type { MergeInput, MergeResult, MergeStep } from '../value/merge-conflict.js';
import { mergeOrderedSet } from './merge-ordered-set.js';
import { mergeRows } from './merge-rows.js';
import { identifyRows } from './row-identity.js';

function isStringList(list: readonly unknown[]): list is string[] {
    return list.every((item) => typeof item === 'string');
}

/** Rows when the items name themselves, an ordered set when they are strings, else a question. */
export function mergeLists(
    input: MergeInput,
    ours: readonly unknown[],
    theirs: readonly unknown[],
    merge: MergeStep,
): MergeResult {
    const base = Array.isArray(input.base) ? input.base : [];
    const rows = identifyRows(base, ours, theirs);

    if (rows !== undefined) {
        return mergeRows(rows, input, merge);
    }

    if (isStringList(base) && isStringList(ours) && isStringList(theirs)) {
        return { value: mergeOrderedSet(base, ours, theirs), conflicts: [] };
    }

    return askAboutValue(input);
}
