import { SlidersIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import {
    Badge,
    Button,
    Checkbox,
    IconButton,
    TableLeadCell,
    TableRowActions,
    Tooltip,
} from '@mandor/ui';
import type { ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import type { KeyValueLine } from './key-value-line.js';
import { KeyValueDescriptionCell } from './KeyValueDescriptionCell.js';
import { KeyValueDragHandle } from './KeyValueDragHandle.js';
import { KeyValueKeyInput } from './KeyValueKeyInput.js';
import { KeyValueValueCell } from './KeyValueValueCell.js';
import { TypePopover } from './TypePopover.js';

type KeyValueLineProps = {
    line: KeyValueLine;
};

type KeyValueRowProps = KeyValueLineProps & {
    /** Where the pair stands in the whole table, drawn or not. */
    index: number;
    /** Measures the row once drawn: a pair is as tall as its fields, not a line of the scale. */
    measure: (node: Element | null) => void;
};

/**
 * One pair of the table: whether it is sent, its key, its value — spoken in the voice the
 * table was given — and, hovering, the ways out: the mark of secret when the table carries
 * them, the type, and the door. The handle carries it across the table; the order the rows
 * keep is the order the pairs go out in.
 */
export function KeyValueRow({ index, line, measure }: KeyValueRowProps): ReactNode {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    return (
        <tr
            className="group"
            data-disabled={line.disabled || undefined}
            data-dragging={table.dragId === line.id || undefined}
            data-index={index}
            data-kv-row={line.id}
            data-part="key-value-row"
            ref={measure}
        >
            <KeyValueDragHandle line={line} />
            <LineSwitch line={line} />
            <td data-kv-cell="key" data-part="key-value-cell">
                <KeyValueKeyInput
                    invalid={table.keyInvalid(line)}
                    label={messages('keyValueColumnKey')}
                    onValueChange={(name) => {
                        table.editLine(line.id, { name });
                    }}
                    value={line.name}
                />
                <KeyValueTypeBadge line={line} />
            </td>
            <KeyValueValueColumn line={line} />
            <KeyValueDescriptionCell
                onChange={(description) => {
                    table.editLine(line.id, { description });
                }}
                value={line.description ?? ''}
            />
            <TableRowActions>
                <KeyValueSecretToggle line={line} />
                <KeyValueTypeAction line={line} />
                <Tooltip content={messages('entryRemove')}>
                    <IconButton
                        className="text-text-secondary"
                        icon="delete"
                        label={messages('entryRemove')}
                        onClick={() => {
                            table.removeLine(line.id);
                        }}
                        size="sm"
                    />
                </Tooltip>
            </TableRowActions>
        </tr>
    );
}

function KeyValueTypeBadge({ line }: KeyValueLineProps) {
    if (line.meta?.type === undefined) {
        return null;
    }

    return (
        <span className="ms-gap-icon-text shrink-0">
            <Badge tone="neutral">{line.meta.type}</Badge>
        </span>
    );
}

function KeyValueValueColumn({ line }: KeyValueLineProps) {
    const table = useKeyValueTable();

    if (!table.columns.value) {
        return null;
    }

    return (
        <td data-kv-cell="value" data-part="key-value-cell">
            <KeyValueValueCell line={line} />
        </td>
    );
}

function KeyValueSecretToggle({ line }: KeyValueLineProps) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (!table.secretable) {
        return null;
    }

    return (
        <IconButton
            active={line.secret}
            icon="eye-closed"
            label={messages('variableSecret')}
            onClick={() => {
                table.editLine(line.id, { secret: !line.secret });
            }}
            size="sm"
        />
    );
}

function KeyValueTypeAction({ line }: KeyValueLineProps) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (!table.typed) {
        return null;
    }

    return (
        <TypePopover
            meta={line.meta}
            onMetaChange={(meta) => {
                table.editLine(line.id, { meta });
            }}
        >
            <Button
                className="gap-gap-icon-text px-gap-tight text-sm text-text-secondary enabled:hover:text-text-primary"
                size="sm"
                variant="ghost"
            >
                <SlidersIcon size="md" />
                {messages('keyValueType')}
            </Button>
        </TypePopover>
    );
}

function LineSwitch({ line }: { line: KeyValueLine }) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (!table.checkable) {
        return null;
    }

    return (
        <TableLeadCell>
            <Checkbox
                checked={!line.disabled}
                label={messages('entrySends')}
                onCheckedChange={(checked) => {
                    table.editLine(line.id, { disabled: !checked });
                }}
            />
        </TableLeadCell>
    );
}
