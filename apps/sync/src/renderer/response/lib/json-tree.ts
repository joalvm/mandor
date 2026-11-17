import type { TreeLine } from '@mandor/ui';

/** One line of a JSON document read as a table: the name or the index, and what it holds. */
export type JsonEntry = {
    key: string;
    value: unknown;
};

/** A line of the document as the tree draws it: where it sits, its name and what it holds. */
export type JsonLine = TreeLine & JsonEntry;

/** What a value holding nothing else is: the colour it is read in follows from it. */
export type JsonScalarKind = 'boolean' | 'null' | 'number' | 'string';

/** The document a text holds, or `undefined` when the text is not JSON. */
export function parsedJson(text: string): { value: unknown } | undefined {
    try {
        return { value: JSON.parse(text) as unknown };
    } catch {
        return undefined;
    }
}

/** Whether a value holds others: an object or an array, and not `null`. */
export function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
    return typeof value === 'object' && value !== null;
}

/**
 * The lines a value opens into: an object by its names, an array by its indices, in the order
 * the document wrote them. A value that holds nothing else opens into nothing.
 */
export function entriesOf(value: unknown): JsonEntry[] | null {
    if (!isContainer(value)) {
        return null;
    }

    return Object.entries(value).map(([key, each]) => ({ key, value: each }));
}

/** The step a name adds to the id of a line, escaped so no name reads as two steps. */
function stepOf(key: string): string {
    return `/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

/** Appends the lines of one value, and under each one that is open, the lines it holds. */
function appendLines(
    lines: JsonLine[],
    parent: TreeLine & { value: unknown },
    open: ReadonlySet<string>,
): void {
    for (const { key, value } of entriesOf(parent.value) ?? []) {
        const id = parent.id + stepOf(key);
        const expanded = isContainer(value) ? open.has(id) : undefined;

        lines.push({ expanded, id, key, level: parent.level, value });

        if (expanded === true) {
            appendLines(lines, { id, level: parent.level + 1, value }, open);
        }
    }
}

/**
 * The lines of a document as they stand on screen: its first level, and under each line in
 * `open` the lines it holds. A closed value is never walked, so a document of a million lines
 * costs what its open levels hold.
 */
export function jsonLines(value: unknown, open: ReadonlySet<string>): JsonLine[] {
    const lines: JsonLine[] = [];

    appendLines(lines, { id: '', level: 1, value }, open);

    return lines;
}

/** The lines open once one of them opens or folds. */
export function openAfter(open: ReadonlySet<string>, id: string, expanded: boolean): Set<string> {
    const next = new Set(open);

    if (expanded) {
        next.add(id);
    } else {
        next.delete(id);
    }

    return next;
}

/** How a closed value is summed up: the brackets of what it is, and how many lines it holds. */
export function containerMark(value: Record<string, unknown> | unknown[]): string {
    const count = String(Object.keys(value).length);

    return Array.isArray(value) ? `[${count}]` : `{${count}}`;
}

const KIND_OF_TYPE: Readonly<Record<string, JsonScalarKind>> = {
    boolean: 'boolean',
    number: 'number',
    string: 'string',
};

export function scalarKindOf(value: unknown): JsonScalarKind {
    return KIND_OF_TYPE[typeof value] ?? 'null';
}

/** A value that holds nothing else, as it reads: text without its quotes, the rest as JSON. */
export function scalarText(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
}
