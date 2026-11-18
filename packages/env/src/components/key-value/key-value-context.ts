import { createContext, type KeyboardEvent, useContext } from 'react';

import type { Environment, Variable } from '@mandor/schema';

import type {
    KeyValueAutoLine,
    KeyValueCell,
    KeyValueColumns,
    KeyValueLine,
    KeyValuePreset,
} from './key-value-line.js';

/** What the table shares with its rows: the data in force and the ways it changes. */
export type KeyValueTableContextValue = {
    /** Takes a preset into the table whole, each line under an identity of its own. */
    applyPreset: (id: string) => void;
    /** Whether the table is being read as one bulk text instead of rows. */
    bulk: boolean;
    /** Whether the toolbar carries the bulk text at all; a table of one truth says no. */
    bulkEdit: boolean;
    /** Whether each line carries the switch that says it goes out. */
    checkable: boolean;
    /** Puts the book of presets away. */
    closePresets: () => void;
    /** Whether the toolbar carries the menu that turns columns on and off. */
    columnMenu: boolean;
    columns: KeyValueColumns;
    /** The id of the line being carried by its handle, while the drag lasts. */
    dragId: string | undefined;
    editLine: (id: string, part: Partial<KeyValueLine>) => void;
    environment: Environment | undefined;
    /** The rows the app adds by itself; nothing given, nothing shown. */
    autoLines?: readonly KeyValueAutoLine[] | undefined;
    /** The owner of the auto rows hears their checkboxes and their ways in; without it they stand. */
    onAutoLinesChange?: ((lines: readonly KeyValueAutoLine[]) => void) | undefined;
    onAutoFollow?: ((id: string) => void) | undefined;
    /** Whether a line's key stops its list from being kept; such a key wears the error line. */
    keyInvalid: (line: KeyValueLine) => boolean;
    /** The names the key cell suggests while a header is being written. */
    keySuggestions?: readonly string[] | undefined;
    lines: readonly KeyValueLine[];
    /** Whether the book of presets is open over the table. */
    managing: boolean;
    moveLine: (id: string, toIndex: number) => void;
    onColumnsChange: (columns: KeyValueColumns) => void;
    /** Rewrites the whole book of presets; the owner keeps it wherever it lives. */
    onPresetsChange?: ((presets: readonly KeyValuePreset[]) => void) | undefined;
    onToggleAuto: () => void;
    onToggleBulk: () => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** Opens the dialog that keeps the book of presets. */
    openPresets: () => void;
    presets?: readonly KeyValuePreset[] | undefined;
    removeLine: (id: string) => void;
    /** Whether the rows may carry a secret value: masked until the row itself reveals it. */
    secretable: boolean;
    /** The pair an arrow walked to, drawn wherever the scroll is. */
    reachedId: string | undefined;
    /** The strip of rows, so a drag measures where the pointer lands. */
    rowsRef: React.RefObject<HTMLTableSectionElement | null>;
    setDragId: (id: string | undefined) => void;
    spawnLine: (cell: KeyValueCell, value: string) => void;
    /** Whether the table is too narrow for the description, which goes under key and value. */
    stacked: boolean;
    /** Whether the rows the app adds are being read; hidden by default. */
    autoShown: boolean;
    typed: boolean;
    /** Whether the value speaks variables: tokens, suggestions and the popover of one. */
    variables: boolean;
    /** The keys that walk the grid, which ask for the pair beside when it is not drawn. */
    walk: (event: KeyboardEvent<HTMLElement>) => void;
};

export const KeyValueTableContext = createContext<KeyValueTableContextValue | undefined>(undefined);

/** The table a row serves. A row without a table above it is a wiring mistake. */
export function useKeyValueTable(): KeyValueTableContextValue {
    const table = useContext(KeyValueTableContext);

    if (table === undefined) {
        throw new Error('KeyValueRow fuera de KeyValueTable');
    }

    return table;
}
