import { useMessages } from '@mandor/i18n';
import { Input, TableLeadCell } from '@mandor/ui';
import { type ReactNode, useEffect, useRef } from 'react';

import { VariableInput } from '../field/VariableInput.js';
import { useKeyValueTable } from './key-value-context.js';
import type { KeyValueCell } from './key-value-line.js';
import { KeyValueDescriptionCell } from './KeyValueDescriptionCell.js';
import { KeyValueKeyInput } from './KeyValueKeyInput.js';
import { walkGrid } from './key-value-walk.js';

/**
 * The empty row that is always at the end. It holds no line: writing in it is what brings
 * one, so the table has no add button and no count of rows to keep true. The tabulator
 * reaches it like any row, and an arrow that walks past the last line lands here.
 */
export function KeyValueGhostRow(): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();
    const editable = useRef<HTMLSpanElement>(null);
    const delivered = useRef(false);

    useEffect(() => {
        const node = editable.current;

        if (node === null) {
            return;
        }

        // The blur of the row the focus just left delivers the ghost's leftover text again:
        // one delivery per visit, reset when the ghost is written into once more.
        const gain = (): void => {
            delivered.current = false;
        };

        node.addEventListener('focus', gain);

        return () => {
            node.removeEventListener('focus', gain);
        };
    }, []);

    const spawn = (cell: KeyValueCell, value: string): void => {
        if (value.trim() === '' || delivered.current) {
            return;
        }

        delivered.current = true;
        table.spawnLine(cell, value);
    };

    return (
        <tr data-ghost="true" data-kv-row="ghost" data-part="key-value-row">
            <TableLeadCell />
            <GhostSwitch />
            <td data-kv-cell="key" data-part="key-value-cell">
                <KeyValueKeyInput
                    editableRef={editable}
                    label={messages('keyValueColumnKey')}
                    onValueChange={(value) => {
                        spawn('key', value);
                    }}
                    placeholder={messages('keyValueColumnKey')}
                    value=""
                />
            </td>
            <GhostValueCell spawn={spawn} />
            <KeyValueDescriptionCell
                onChange={(value) => {
                    spawn('description', value);
                }}
                value=""
            />
        </tr>
    );
}

type Spawn = (cell: KeyValueCell, value: string) => void;

function GhostValueCell({ spawn }: { spawn: Spawn }) {
    const table = useKeyValueTable();

    if (!table.columns.value) {
        return null;
    }

    return (
        <td data-kv-cell="value" data-part="key-value-cell">
            <GhostValueInput spawn={spawn} />
        </td>
    );
}

function GhostValueInput({ spawn }: { spawn: Spawn }) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (table.variables) {
        return (
            <VariableInput
                className="min-w-0 flex-1"
                environment={table.environment}
                label={messages('keyValueColumnValue')}
                onKeyDown={walkGrid}
                onChange={(value) => {
                    spawn('value', value);
                }}
                onVariablesChange={table.onVariablesChange}
                placeholder={messages('keyValueColumnValue')}
                value=""
                variant="flat"
            />
        );
    }

    return (
        <Input
            className="min-w-0 flex-1"
            label={messages('keyValueColumnValue')}
            onKeyDown={walkGrid}
            onValueChange={(value) => {
                spawn('value', value);
            }}
            placeholder={messages('keyValueColumnValue')}
            value=""
            variant="flat"
        />
    );
}

function GhostSwitch() {
    const { checkable } = useKeyValueTable();

    if (!checkable) {
        return null;
    }

    return <TableLeadCell />;
}
