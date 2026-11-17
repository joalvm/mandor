import { irEqual } from './ir-equal.js';

/** The differences of one keyed section: members of one side only, and pairs that disagree. */
export function keyed<T>(
    section: string,
    left: readonly T[],
    right: readonly T[],
    one: (path: string, left: T, right: T) => string[],
): string[] {
    const pathOf = (value: T): string => `${section}.${nameOf(value)}`;
    const leftSide = left.map((value) => ({ path: pathOf(value), value }));
    const rightSide = right.map((value) => ({ path: pathOf(value), value }));
    const differences: string[] = [];

    for (const entry of leftSide) {
        const other = rightSide.find((each) => each.path === entry.path);

        if (other === undefined) {
            differences.push(entry.path);

            continue;
        }

        differences.push(...one(entry.path, entry.value, other.value));
    }

    for (const entry of rightSide) {
        if (!leftSide.some((each) => each.path === entry.path)) {
            differences.push(entry.path);
        }
    }

    return differences;
}

/** The members of a list whose order says nothing: the same set is the same thing. */
export function sameSet(
    left: readonly string[] | undefined,
    right: readonly string[] | undefined,
): boolean {
    return irEqual([...(left ?? [])].sort(), [...(right ?? [])].sort());
}

/** The whole value says the same, or the path where it lives is the difference. */
export function equalDiff(path: string, left: unknown, right: unknown): string[] {
    return irEqual(left, right) ? [] : [path];
}

function nameOf(value: unknown): string {
    if (isNamed(value)) {
        return value.name;
    }

    return typeof value === 'string' ? value : '';
}

function isNamed(value: unknown): value is { name: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'name' in value &&
        typeof value.name === 'string'
    );
}
