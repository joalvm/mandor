import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { render } from '@testing-library/react';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { vi, type Mock } from 'vitest';

import {
    KeyValueTableContext,
    useKeyValueTable,
} from '../../src/components/key-value/key-value-context.js';
import type {
    KeyValueColumns,
    KeyValueLine,
} from '../../src/components/key-value/key-value-line.js';
import {
    useKeyValueTableState,
    type KeyValueTableOptions,
} from '../../src/components/key-value/useKeyValueTableState.js';

export const FIXTURE: readonly KeyValueLine[] = [
    { disabled: false, id: '0', name: 'start', value: '2024-07-16' },
    { disabled: true, id: '1', name: 'end', value: '2024-08-16' },
    { disabled: false, id: '2', meta: { type: 'number' }, name: 'token', value: '{{token}}' },
];

export const BOTH: KeyValueColumns = { description: true, value: true };
export const VALUE_ONLY: KeyValueColumns = { description: false, value: true };

type HolderProps = PropsWithChildren<{
    onColumns: (columns: KeyValueColumns) => void;
    onLines: (lines: readonly KeyValueLine[]) => void;
    options: Partial<KeyValueTableOptions>;
}>;

/**
 * What a table does for its parts: the real state of the table and its lines held by an owner.
 * What the table says of itself is written in an output, so a part that only flips a flag can
 * be read from outside.
 */
function Holder({ children, onColumns, onLines, options }: HolderProps): ReactNode {
    const [lines, setLines] = useState<readonly KeyValueLine[]>(options.lines ?? FIXTURE);
    const [columns, setColumns] = useState(options.columns ?? VALUE_ONLY);
    const table = useKeyValueTableState({
        environment: undefined,
        onVariablesChange: () => undefined,
        typed: false,
        ...options,
        columns,
        lines,
        onColumnsChange: (next) => {
            setColumns(next);
            onColumns(next);
        },
        onLinesChange: (next) => {
            setLines(next);
            onLines(next);
        },
    });
    const { autoShown, bulk, managing } = table.context;
    const said = [autoShown ? 'auto' : '', bulk ? 'bulk' : '', managing ? 'managing' : ''];

    return (
        <KeyValueTableContext.Provider value={table.context}>
            <div data-part="key-value-table" ref={table.rootRef}>
                {children}
            </div>
            <output aria-label="Estado">{said.filter((word) => word !== '').join(' ')}</output>
            <output aria-label="Líneas">{lines.map((line) => line.name).join(',')}</output>
        </KeyValueTableContext.Provider>
    );
}

export type Mounted = {
    container: HTMLElement;
    onColumns: Mock<(columns: KeyValueColumns) => void>;
    onLines: Mock<(lines: readonly KeyValueLine[]) => void>;
};

/** A part inside the real state of a table, in Spanish like the rest of the table tests. */
export function mountInTable(
    children: ReactNode,
    options: Partial<KeyValueTableOptions> = {},
): Mounted {
    const onColumns = vi.fn<(columns: KeyValueColumns) => void>();
    const onLines = vi.fn<(lines: readonly KeyValueLine[]) => void>();
    const { container } = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <Holder onColumns={onColumns} onLines={onLines} options={options}>
                    {children}
                </Holder>
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { container, onColumns, onLines };
}

/** The strip of rows the row parts hang from: the body of a table, as the real one draws it. */
export function TableRows({ children }: PropsWithChildren): ReactNode {
    const table = useKeyValueTable();

    return (
        <table>
            <tbody data-part="key-value-rows" ref={table.rowsRef}>
                {children}
            </tbody>
        </table>
    );
}

/** Rows, or the cells of one, inside the real state of a table and the body it draws. */
export function mountRowsInTable(
    children: ReactNode,
    options: Partial<KeyValueTableOptions> = {},
): Mounted {
    return mountInTable(<TableRows>{children}</TableRows>, options);
}

/** A part that needs no table: only the words of the environment. */
export function mountAlone(children: ReactNode): HTMLElement {
    const { container } = render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>,
    );

    return container;
}

/** The names the last change left, in order. */
export function namesOf(mounted: Mounted): string[] {
    return (mounted.onLines.mock.lastCall?.[0] ?? []).map((line) => line.name);
}
