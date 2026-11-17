import { isRecord } from '@mandor/interop-core';

/**
 * A node of a document someone else wrote, read as what it should be and as nothing when it is
 * not. The validator has already refused what the specification forbids; what is left to
 * guard against is the shape the specification allows to be absent.
 */
export function asRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

export function recordAt(node: Record<string, unknown>, key: string): Record<string, unknown> {
    return asRecord(node[key]);
}

export function listAt(node: Record<string, unknown>, key: string): unknown[] {
    const value = node[key];

    return Array.isArray(value) ? value : [];
}

export function textAt(node: Record<string, unknown>, key: string): string | undefined {
    const value = node[key];

    return typeof value === 'string' ? value : undefined;
}

/** The first of the values that is a text with something written in it. */
export function firstText(...values: unknown[]): string | undefined {
    return values.find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
}
