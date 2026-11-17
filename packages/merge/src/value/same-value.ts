import { isObject } from './plain-object.js';

function sameList(left: readonly unknown[], right: readonly unknown[]): boolean {
    return (
        left.length === right.length && left.every((item, index) => sameValue(item, right[index]))
    );
}

function sameObject(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    const keys = Object.keys(left);

    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]))
    );
}

/** Deep equality of JSON values. The order of the keys of an object is not part of its value. */
export function sameValue(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        return sameList(left, right);
    }

    if (isObject(left) && isObject(right)) {
        return sameObject(left, right);
    }

    return false;
}
