import type { Environment, Variable } from '@mandor/schema';
import { useEffect, useRef, useState } from 'react';

import { nextLineId } from '../../lib/entry-line.js';

import {
    bulkTextOf,
    linesOfBulk,
    moveKeyValueLine,
    patchOf,
    withKeyValuePreset,
    type KeyValueAutoLine,
    type KeyValueColumns,
    type KeyValueLine,
    type KeyValuePreset,
} from './key-value-line.js';
import type { KeyValueTableContextValue } from './key-value-context.js';
import { focusCellOf, walkGrid } from './key-value-walk.js';
import { useKeyValueStack } from './useKeyValueStack.js';

function NEVER_INVALID(): boolean {
    return false;
}

/** What a table of pairs is handed: its lines, the ways they change, and the extras it may carry. */
export type KeyValueTableOptions = {
    /** The rows the app adds by itself, read but never edited; hidden until asked for. */
    autoLines?: readonly KeyValueAutoLine[] | undefined;
    /** Whether the toolbar carries the bulk text; a table whose lines are one truth says no. */
    bulkEdit?: boolean | undefined;
    /** Whether each line carries the switch that says it goes out; a list that sends nothing says no. */
    checkable?: boolean | undefined;
    /** The columns in force; the key is the one the table never takes away. */
    columns: KeyValueColumns;
    /** Whether the toolbar carries the menu that turns columns on and off. */
    columnMenu?: boolean | undefined;
    environment: Environment | undefined;
    /** Whether a line's key stops its list from being kept; such a key wears the error line. */
    keyInvalid?: ((line: KeyValueLine) => boolean) | undefined;
    /** The names the key cell suggests while it is being written. */
    keySuggestions?: readonly string[] | undefined;
    lines: readonly KeyValueLine[];
    /** The owner of the auto rows hears the way in of one of them. */
    onAutoFollow?: ((id: string) => void) | undefined;
    /** The owner of the auto rows hears their checkboxes; without it they stand. */
    onAutoLinesChange?: ((lines: readonly KeyValueAutoLine[]) => void) | undefined;
    onColumnsChange: (columns: KeyValueColumns) => void;
    onLinesChange: (lines: readonly KeyValueLine[]) => void;
    /** Rewrites the book of presets; without it the presets are only a list to take from. */
    onPresetsChange?: ((presets: readonly KeyValuePreset[]) => void) | undefined;
    /** The variables the fields may declare from their popover; the owner writes them. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** The named groups the table may take in whole. */
    presets?: readonly KeyValuePreset[] | undefined;
    /** Whether the rows may carry a secret value that the row itself unmasks. */
    secretable?: boolean | undefined;
    /** Whether rows carry a type at all. Without it, no row offers the type panel. */
    typed: boolean;
    /** Whether the value speaks variables; a table of literal values says no. */
    variables?: boolean | undefined;
};

/**
 * Everything the table keeps while it stands: the lines and the ways they change, the bulk
 * text, the drag, the cell the walk lands on, and the two extras a
 * caller may hand in — rows the app adds and a book of presets. One object the rows read.
 */
export function useKeyValueTableState(options: KeyValueTableOptions) {
    const { lines, onLinesChange, presets } = options;
    const rootRef = useRef<HTMLDivElement>(null);
    const rowsRef = useRef<HTMLTableSectionElement>(null);
    const [autoShown, setAutoShown] = useState(false);
    const [bulk, setBulk] = useState(false);
    const [bulkDraft, setBulkDraft] = useState('');
    const [dragId, setDragId] = useState<string | undefined>(undefined);
    /** The cell of a line just spawned or walked to, focused once its row is drawn. */
    const focusCell = useRef<{ cell: string; id: string } | null>(null);
    const [managing, setManaging] = useState(false);
    const [reachedId, setReachedId] = useState<string | undefined>(undefined);
    const { gridColumns, stacked } = useKeyValueStack(rootRef, options.columns);

    function reachLine(index: number, cell: string): boolean {
        const line = lines[index];

        if (line === undefined) {
            return false;
        }

        focusCell.current = { cell, id: line.id };
        setReachedId(line.id);

        return true;
    }

    // Every draw may be the one that brings the spawned row, whenever its owner writes it.
    useEffect(() => {
        const wanted = focusCell.current;

        if (wanted === null) {
            return;
        }

        const selector = `[data-kv-row="${wanted.id}"] [data-kv-cell="${wanted.cell}"]`;
        const found = rootRef.current?.querySelector<HTMLElement>(selector) ?? null;

        if (found === null) {
            return;
        }

        focusCell.current = null;
        focusCellOf(found);
    });

    const context: KeyValueTableContextValue = {
        ...options,
        bulkEdit: options.bulkEdit ?? true,
        checkable: options.checkable ?? true,
        columnMenu: options.columnMenu ?? true,
        keyInvalid: options.keyInvalid ?? NEVER_INVALID,
        secretable: options.secretable ?? false,
        variables: options.variables ?? true,
        applyPreset: (id) => {
            const preset = presets?.find((each) => each.id === id);

            if (preset === undefined) {
                return;
            }

            onLinesChange(withKeyValuePreset(lines, preset));
        },
        autoShown,
        bulk,
        closePresets: () => {
            setManaging(false);
        },
        dragId,
        editLine: (id, part) => {
            onLinesChange(lines.map((line) => (line.id === id ? { ...line, ...part } : line)));
        },
        managing,
        moveLine: (id, toIndex) => {
            onLinesChange(moveKeyValueLine(lines, id, toIndex));
        },
        onToggleAuto: () => {
            setAutoShown(!autoShown);
        },
        onToggleBulk: () => {
            if (bulk) {
                onLinesChange(linesOfBulk(bulkDraft, lines));
                setBulk(false);

                return;
            }

            setBulkDraft(bulkTextOf(lines));
            setBulk(true);
        },
        openPresets: () => {
            setManaging(true);
        },
        removeLine: (id) => {
            onLinesChange(lines.filter((line) => line.id !== id));
        },
        reachedId,
        rowsRef,
        setDragId,
        stacked,
        spawnLine: (cell, value) => {
            const id = nextLineId(lines);

            onLinesChange([
                ...lines,
                { disabled: false, id, name: '', value: '', ...patchOf(cell, value) },
            ]);
            focusCell.current = { cell, id };
        },
        walk: (event) => {
            walkGrid(event, reachLine);
        },
    };

    return {
        bulkDraft,
        context,
        gridColumns,
        rootRef,
        rowsRef,
        setBulkDraft,
    };
}
