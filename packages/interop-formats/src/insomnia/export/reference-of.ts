import { isRecord } from '@mandor/interop-core';

/** `{{name}}`, the way Mandor points at a variable; a dynamic one, `{{$uuid}}`, is not a name. */
const REFERENCE = /\{\{([A-Za-z_][\w-]*)\}\}/g;

/**
 * Rewrites every reference to a variable inside strings, arrays and plain objects the way
 * Insomnia writes it: `{{ _.name }}`, which its environments answer.
 */
export function withReferences<T>(value: T): T {
    return rewritten(value) as T;
}

function rewritten(value: unknown): unknown {
    if (typeof value === 'string') {
        return value.replace(REFERENCE, '{{ _.$1 }}');
    }

    if (Array.isArray(value)) {
        return value.map(rewritten);
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, each]) => [key, rewritten(each)]),
        );
    }

    return value;
}
