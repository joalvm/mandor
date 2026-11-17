import type { KeyValueMeta } from '@mandor/schema';

import { nextLineId, type EntryLine } from '../../lib/entry-line.js';

/** A line of a key-value table: everything an entry line keeps, plus what the columns add. */
export type KeyValueLine = EntryLine & {
    description?: string | undefined;
    meta?: KeyValueMeta | undefined;
    /**
     * A value the table wears masked until its row reveals it. Only a `secretable` table
     * offers the mark; a line marked in any other one is data waiting for its owner.
     */
    secret?: boolean | undefined;
};

/** A row the app adds by itself and nobody edits: what goes out either way, said plainly. */
export type KeyValueAutoLine = {
    /** The line that says why the row is there, shown beside it. */
    description?: string | undefined;
    /** The identity the row keeps while it stands, so leaving it out is said by it. */
    id: string;
    /** True while nobody knows the value: the request computes it when it goes out. */
    calculated?: boolean | undefined;
    name: string;
    /** One the app does not let go: its checkbox stays grey. */
    locked?: boolean | undefined;
    /** True while the row is left out of the request: unchecked, grey, still said. */
    left?: boolean | undefined;
    /** The name of the row of the table that takes this one out of the request. */
    overriddenBy?: string | undefined;
    /** The place of the app the row answers to, said the way the app says it. */
    follow?: { label: string } | undefined;
    /** What goes out; a value the app keeps secret arrives here already redacted. */
    value: string;
};

/** A named group of lines the table can take in whole, kept by whoever owns the table. */
export type KeyValuePreset = {
    id: string;
    lines: readonly KeyValueLine[];
    name: string;
};

/** The columns a table shows, beside the key every row always carries. */
export type KeyValueColumns = {
    description: boolean;
    value: boolean;
};

export type KeyValueCell = 'description' | 'key' | 'value';

/** The cells of a row, in the order the grid lays them out: the key never moves. */
export function cellColumnsOf(columns: KeyValueColumns): readonly KeyValueCell[] {
    return [
        'key',
        ...(columns.value ? (['value'] as const) : []),
        ...(columns.description ? (['description'] as const) : []),
    ];
}

const PATCH_OF_CELL: Readonly<Record<KeyValueCell, (value: string) => Partial<KeyValueLine>>> = {
    description: (value) => ({ description: value }),
    key: (value) => ({ name: value }),
    value: (value) => ({ value }),
};

/** What writing into the empty last row turns into, per the cell that took it. */
export function patchOf(cell: KeyValueCell, value: string): Partial<KeyValueLine> {
    return PATCH_OF_CELL[cell](value);
}

/**
 * The lines with a preset taken in whole at the end, each arrival under an identity none of
 * the lines on the table holds — a preset applies twice and lands twice.
 */
export function withKeyValuePreset(
    lines: readonly KeyValueLine[],
    preset: KeyValuePreset,
): KeyValueLine[] {
    const first = Number(nextLineId(lines));

    return [
        ...lines,
        ...preset.lines.map((line, at) => ({
            ...line,
            id: String(first + at),
        })),
    ];
}

/**
 * The lines with the line of `id` carried to `toIndex`, closing the gap it left. A drag asks
 * for this once per crossing; the caller keeps the array order as the only truth.
 */
export function moveKeyValueLine(
    lines: readonly KeyValueLine[],
    id: string,
    toIndex: number,
): KeyValueLine[] {
    const from = lines.findIndex((line) => line.id === id);

    if (from === -1) {
        return [...lines];
    }

    const carried = lines[from];

    if (carried === undefined) {
        return [...lines];
    }

    const bound = Math.max(0, Math.min(toIndex, lines.length - 1));
    const without = lines.filter((line) => line.id !== id);

    return [...without.slice(0, bound), carried, ...without.slice(bound)];
}

/** The pair one bulk line spells. A line that carries no `:` keeps its value empty. */
function lineOfBulkRow(row: string): { disabled: boolean; key: string; value: string } {
    const disabled = row.startsWith('//');
    const clean = disabled ? row.slice(2) : row;
    const at = clean.indexOf(':');

    return {
        disabled,
        key: at === -1 ? clean : clean.slice(0, at),
        value: at === -1 ? '' : clean.slice(at + 1),
    };
}

/**
 * The bulk text of the lines: one `key:value` per line, the disabled ones commented with `//`.
 * The text is the same table said in one column; nothing in it is a dialect of its own.
 */
export function bulkTextOf(lines: readonly KeyValueLine[]): string {
    return lines.map((line) => `${line.disabled ? '//' : ''}${line.name}:${line.value}`).join('\n');
}

/**
 * The lines a bulk text spells, keeping what each named line already was — its id, its
 * description and its meta — so toggling to bulk and back loses nothing the table held.
 * A name the table never had arrives as a new line; a name that left, leaves.
 */
export function linesOfBulk(text: string, previous: readonly KeyValueLine[]): KeyValueLine[] {
    const knownByName = new Map(previous.map((line) => [line.name, line]));
    const taken = new Set<string>();
    const lines: KeyValueLine[] = [];

    for (const row of text.split('\n')) {
        const trimmed = row.trim();

        if (trimmed === '') {
            continue;
        }

        const { disabled, key, value } = lineOfBulkRow(trimmed);
        const known = knownByName.get(key);

        if (known !== undefined && !taken.has(known.id)) {
            taken.add(known.id);
            lines.push({ ...known, disabled, name: key, value });

            continue;
        }

        lines.push({
            description: undefined,
            disabled,
            id: nextLineId([...previous, ...lines]),
            meta: undefined,
            name: key,
            value,
        });
    }

    return lines;
}
