import { isRecord } from './is-record.js';

/**
 * Whether two unknown-shaped values say the same thing. `$ref` keys are left out on both
 * sides: a reference path is where a document kept a piece of content, and where is addressing,
 * not content — the same payload under another path is still the same payload. A key that
 * holds `undefined` counts as absent: a model is kept as JSON, which drops it, and the model read
 * back from disk is still the same model.
 */
export function irEqual(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        return (
            left.length === right.length &&
            left.every((entry, index) => irEqual(entry, right[index]))
        );
    }

    if (isRecord(left) && isRecord(right)) {
        const leftKeys = keysOf(left);
        const rightKeys = keysOf(right);

        return (
            leftKeys.length === rightKeys.length &&
            leftKeys.every((key) => key in right && irEqual(left[key], right[key]))
        );
    }

    return false;
}

function keysOf(record: Record<string, unknown>): string[] {
    return Object.keys(record).filter((key) => key !== '$ref' && record[key] !== undefined);
}
