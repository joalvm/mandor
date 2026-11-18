type Header = readonly [string, string];

export type HeaderChange = 'added' | 'changed' | 'removed' | 'same';

export type HeaderDiffRow = {
    after: readonly string[];
    before: readonly string[];
    change: HeaderChange;
    /** As the first response that had it wrote it; names differ only in case across the two. */
    name: string;
};

type Named = { name: string; values: string[] };

/** The values of each header in the order they came, under the name read without its case. */
function groupedByName(headers: readonly Header[]): Map<string, Named> {
    const groups = new Map<string, Named>();

    for (const [name, value] of headers) {
        const key = name.toLowerCase();
        const group = groups.get(key) ?? { name, values: [] };

        group.values.push(value);
        groups.set(key, group);
    }

    return groups;
}

function changeOf(before: readonly string[], after: readonly string[]): HeaderChange {
    if (before.length === 0) {
        return 'added';
    }

    if (after.length === 0) {
        return 'removed';
    }

    const same = before.length === after.length && before.every((value, at) => value === after[at]);

    return same ? 'same' : 'changed';
}

/**
 * What the headers of two responses did: which are new, which are gone and which moved. A header
 * sent more than once is one entry whose values are an ordered list, so reordering its lines is
 * a change. The rows keep the order of the first response, with the new ones after.
 */
export function headerDiff(before: readonly Header[], after: readonly Header[]): HeaderDiffRow[] {
    const left = groupedByName(before);
    const right = groupedByName(after);
    const keys = new Set([...left.keys(), ...right.keys()]);

    return [...keys].map((key) => {
        const first = left.get(key);
        const second = right.get(key);
        const beforeValues = first?.values ?? [];
        const afterValues = second?.values ?? [];

        return {
            after: afterValues,
            before: beforeValues,
            change: changeOf(beforeValues, afterValues),
            name: (first ?? second)?.name ?? key,
        };
    });
}
