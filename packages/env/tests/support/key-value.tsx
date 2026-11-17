import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { render } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

import { KeyValueTable } from '../../src/components/key-value/KeyValueTable.js';
import type {
    KeyValueAutoLine,
    KeyValueColumns,
    KeyValueLine,
    KeyValuePreset,
} from '../../src/components/key-value/key-value-line.js';

export const LINES: KeyValueLine[] = [
    { disabled: false, id: '0', name: 'start', value: '2024-07-16' },
    { disabled: true, id: '1', name: 'end', value: '2024-08-16' },
    {
        description: 'Token del entorno',
        disabled: false,
        id: '2',
        meta: { type: 'number' },
        name: 'token',
        value: '{{token}}',
    },
];

export const COLUMNS: KeyValueColumns = { description: false, value: true };

type TableProps = {
    autoLines?: readonly KeyValueAutoLine[] | undefined;
    bulkEdit?: boolean | undefined;
    columns?: KeyValueColumns;
    columnMenu?: boolean | undefined;
    keySuggestions?: readonly string[] | undefined;
    lines?: KeyValueLine[];
    onAutoFollow?: ((id: string) => void) | undefined;
    onAutoLinesChange?: ((lines: readonly KeyValueAutoLine[]) => void) | undefined;
    onLinesChange?: ((lines: readonly KeyValueLine[]) => void) | undefined;
    onPresetsChange?: ((presets: readonly KeyValuePreset[]) => void) | undefined;
    presets?: readonly KeyValuePreset[] | undefined;
    secretable?: boolean | undefined;
    typed?: boolean;
    variables?: boolean | undefined;
};

/** The table with its lines held by the owner, the way a feature holds them. */
function Table({
    autoLines: initialAuto,
    bulkEdit = true,
    columns: initialColumns = COLUMNS,
    columnMenu = true,
    keySuggestions,
    lines: initial = LINES,
    onAutoFollow,
    onAutoLinesChange,
    onLinesChange,
    onPresetsChange,
    presets,
    secretable = false,
    typed = false,
    variables = true,
}: TableProps): ReactNode {
    const [lines, setLines] = useState<KeyValueLine[]>([...initial]);
    const [columns, setColumns] = useState(initialColumns);
    const [auto, setAuto] = useState<readonly KeyValueAutoLine[] | undefined>(initialAuto);
    const [book, setBook] = useState<readonly KeyValuePreset[] | undefined>(presets);

    return (
        <KeyValueTable
            autoLines={auto}
            bulkEdit={bulkEdit}
            columns={columns}
            columnMenu={columnMenu}
            environment={undefined}
            keySuggestions={keySuggestions}
            lines={lines}
            onAutoFollow={onAutoFollow}
            onAutoLinesChange={(next) => {
                setAuto(next);
                onAutoLinesChange?.(next);
            }}
            onColumnsChange={setColumns}
            onLinesChange={(next) => {
                setLines([...next]);
                onLinesChange?.(next);
            }}
            onPresetsChange={(next) => {
                setBook(next);
                onPresetsChange?.(next);
            }}
            onVariablesChange={() => undefined}
            presets={book}
            secretable={secretable}
            title="Parámetros de consulta"
            typed={typed}
            variables={variables}
        />
    );
}

export function mount(
    onLinesChange?: (lines: readonly KeyValueLine[]) => void,
    props: Omit<TableProps, 'onLinesChange'> = {},
): HTMLElement {
    return mountIn(undefined, { ...props, onLinesChange });
}

/** The table drawn inside a box of the caller's, the scroller a pane would give it. */
export function mountIn(box: HTMLElement | undefined, props: TableProps = {}): HTMLElement {
    const { container } = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <Table {...props} />
            </TooltipProvider>
        </MessagesProvider>,
        box === undefined ? {} : { container: box },
    );

    return container;
}

/** The editable line of one cell of one row. */
export function editableOf(container: HTMLElement, row: string, cell: string): HTMLElement | null {
    return container.querySelector(
        `[data-kv-row="${row}"] [data-kv-cell="${cell}"] [data-part="editable"]`,
    );
}

/** The element at one place of a query, or the failure to have it. */
export function at(elements: HTMLElement[], position: number): HTMLElement {
    const element = elements[position];

    if (element === undefined) {
        throw new Error('no esta');
    }

    return element;
}
