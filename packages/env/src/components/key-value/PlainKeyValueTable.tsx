import { Table } from '@mandor/ui';
import { type PropsWithChildren, type ReactNode, type RefObject, useMemo } from 'react';

import type { KeyValueColumns } from './key-value-line.js';
import { KeyValueAutoRows } from './KeyValueAutoRows.js';
import { KeyValueBulk } from './KeyValueBulk.js';
import { KeyValueGhostRow } from './KeyValueGhostRow.js';
import { KeyValueHead } from './KeyValueHead.js';
import { KeyValueLines } from './KeyValueLines.js';
import { KeyValueTableContext } from './key-value-context.js';
import { tableColumnsOf } from './key-value-table-columns.js';
import { KeyValueToolbar } from './KeyValueToolbar.js';
import { KeyValueTools } from './KeyValueTools.js';
import { useKeyValueTableState, type KeyValueTableOptions } from './useKeyValueTableState.js';

type KeyValueTable = ReturnType<typeof useKeyValueTableState>;

type KeyValueBodyProps = Pick<KeyValueTable, 'bulkDraft' | 'setBulkDraft'> & {
    bulk: boolean;
    checkable: boolean;
    columns: KeyValueColumns;
    rowsRef: RefObject<HTMLTableSectionElement | null>;
    title: string;
};

type PlainKeyValueTableProps = PropsWithChildren<
    KeyValueTableOptions & {
        /** The name the toolbar carries: what the table is a table of. */
        title: string;
    }
>;

/**
 * The table of pairs without the book of presets: the anatomy every list of pairs shares,
 * and what a preset is itself written in. What it contains — the book, for the full table —
 * is drawn inside its context, after the rows.
 */
export function PlainKeyValueTable({
    children,
    title,
    ...options
}: PlainKeyValueTableProps): ReactNode {
    const { bulkDraft, context, gridColumns, rootRef, rowsRef, setBulkDraft } =
        useKeyValueTableState(options);

    return (
        <KeyValueTableContext.Provider value={context}>
            <div
                className="flex min-h-0 flex-col gap-gap-tight"
                data-kv-stacked={context.stacked || undefined}
                data-part="key-value-table"
                ref={rootRef}
            >
                <KeyValueToolbar title={title} />
                <KeyValueBody
                    bulk={context.bulk}
                    bulkDraft={bulkDraft}
                    checkable={context.checkable}
                    columns={gridColumns}
                    rowsRef={rowsRef}
                    setBulkDraft={setBulkDraft}
                    title={title}
                />
            </div>
            {children}
        </KeyValueTableContext.Provider>
    );
}

function KeyValueBody({
    bulk,
    bulkDraft,
    checkable,
    columns,
    rowsRef,
    setBulkDraft,
    title,
}: KeyValueBodyProps) {
    const tableColumns = useMemo(() => tableColumnsOf(columns, checkable), [checkable, columns]);

    if (bulk) {
        return (
            <div className="flex min-h-0 flex-col border border-border-chrome">
                {/* band-policy: head-tools — the tools keep the place they hold over the end of
                    the head while the rows are on. */}
                <div
                    className="flex h-control items-center justify-end gap-gap-tight border-b border-border-subtle px-gap-tight"
                    data-part="key-value-bulk-tools"
                >
                    <KeyValueTools />
                </div>
                <KeyValueBulk draft={bulkDraft} onDraftChange={setBulkDraft} />
            </div>
        );
    }

    return (
        <Table columns={tableColumns} label={title} rowHover={false}>
            <KeyValueHead columns={columns} />
            <tbody data-part="key-value-rows" ref={rowsRef}>
                <KeyValueAutoRows />
                <KeyValueLines />
                <KeyValueGhostRow />
            </tbody>
        </Table>
    );
}
