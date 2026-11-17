import { NO_DECISION, settleResult } from '../choice/settle-conflict.js';
import { mergeLists } from '../list/merge-lists.js';
import { mergeText } from '../text/merge-text.js';
import { askAboutValue } from './ask-about-value.js';
import type { MergeConflict, MergeInput, MergeResult } from './merge-conflict.js';
import { isObject, ownValue } from './plain-object.js';
import { sameValue } from './same-value.js';

function mergeObjects(
    input: MergeInput,
    ours: Record<string, unknown>,
    theirs: Record<string, unknown>,
): MergeResult {
    const base = isObject(input.base) ? input.base : {};
    const keys = [...new Set([...Object.keys(ours), ...Object.keys(theirs)])];
    const entries: [string, unknown][] = [];
    const conflicts: MergeConflict[] = [];

    for (const key of keys) {
        const merged = mergeNode({
            ...input,
            base: ownValue(base, key),
            ours: ownValue(ours, key),
            theirs: ownValue(theirs, key),
            path: [...input.path, key],
        });

        conflicts.push(...merged.conflicts);

        if (merged.value !== undefined) {
            entries.push([key, merged.value]);
        }
    }

    return { value: Object.fromEntries(entries), conflicts };
}

function hasLineBreak(text: string): boolean {
    return text.includes('\n');
}

/** A line break on any side makes a string text; without one it is a value to choose. */
function mergeStrings(input: MergeInput, ours: string, theirs: string): MergeResult {
    const base = typeof input.base === 'string' ? input.base : '';

    if ([base, ours, theirs].some(hasLineBreak)) {
        return settleResult(mergeText(base, ours, theirs, input.path), input.decide);
    }

    return askAboutValue(input);
}

function mergeDiverged(input: MergeInput): MergeResult {
    if (isObject(input.ours) && isObject(input.theirs)) {
        return mergeObjects(input, input.ours, input.theirs);
    }

    if (Array.isArray(input.ours) && Array.isArray(input.theirs)) {
        return mergeLists(input, input.ours, input.theirs, mergeNode);
    }

    if (typeof input.ours === 'string' && typeof input.theirs === 'string') {
        return mergeStrings(input, input.ours, input.theirs);
    }

    return askAboutValue(input);
}

/**
 * One step of the merge, and the recursion every kind of value comes back through. The shortcuts
 * come first: a side that did not move gives the other one, and two equal sides need no base.
 */
export function mergeNode(input: MergeInput): MergeResult {
    const { base, ours, theirs } = input;

    if (sameValue(ours, theirs) || sameValue(base, theirs)) {
        return { value: ours, conflicts: [] };
    }

    if (sameValue(base, ours)) {
        return { value: theirs, conflicts: [] };
    }

    return mergeDiverged(input);
}

/**
 * Three values give one and the questions left. Objects go key by key; ours decides the order and
 * theirs adds its new keys at the end. Where both sides moved the same thing, the value stays
 * ours until someone answers.
 */
export function mergeValues(
    base: unknown,
    ours: unknown,
    theirs: unknown,
    path: readonly string[] = [],
): MergeResult {
    return mergeNode({ base, ours, theirs, path, decide: NO_DECISION });
}
