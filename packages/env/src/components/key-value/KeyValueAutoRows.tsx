import { useMessages } from '@mandor/i18n';
import { InfoIcon } from '@mandor/icons';
import { Button, Checkbox, TableLeadCell, TableRowActions, Tooltip } from '@mandor/ui';
import type { ReactNode } from 'react';

import { useKeyValueTable } from './key-value-context.js';
import type { KeyValueAutoLine } from './key-value-line.js';

/** One read-only row the app adds by itself: the pair it sends, and the line that says why. */
function AutoRow(auto: KeyValueAutoLine): ReactNode {
    const messages = useMessages('environment');
    const pisada = auto.overriddenBy !== undefined;

    return (
        <tr data-part="key-value-auto-row">
            <TableLeadCell />
            <AutoSwitch auto={auto} />
            <td data-kv-cell="key" data-part="key-value-cell">
                <span
                    className="min-w-0 truncate ps-pad-control text-xs"
                    data-overridden={pisada || undefined}
                >
                    {auto.name}
                </span>
            </td>
            <AutoValueCell auto={auto} />
            <AutoDescriptionCell auto={auto} />
            <TableRowActions>
                <AutoFollow auto={auto} />
                <Tooltip content={auto.description ?? messages('keyValueAutoRow')}>
                    <span className="text-text-secondary">
                        <InfoIcon size="sm" />
                    </span>
                </Tooltip>
            </TableRowActions>
        </tr>
    );
}

function AutoValueCell({ auto }: { auto: KeyValueAutoLine }) {
    const table = useKeyValueTable();

    if (!table.columns.value) {
        return null;
    }

    return (
        <td data-kv-cell="value" data-part="key-value-cell">
            <span
                className="min-w-0 truncate ps-pad-control text-xs"
                data-overridden={auto.overriddenBy !== undefined || undefined}
            >
                <AutoValue auto={auto} />
            </span>
        </td>
    );
}

function AutoValue({ auto }: { auto: KeyValueAutoLine }) {
    const messages = useMessages('environment');

    if (auto.calculated) {
        return (
            <code className="rounded-sm bg-surface-sunken px-1 font-mono">
                {messages('keyValueAutoCalculated')}
            </code>
        );
    }

    return <>{auto.value}</>;
}

function AutoDescriptionCell({ auto }: { auto: KeyValueAutoLine }) {
    const table = useKeyValueTable();

    if (!table.columns.description) {
        return null;
    }

    return (
        <td data-kv-cell="description" data-part="key-value-cell">
            <span className="min-w-0 truncate ps-pad-control text-xs">
                {auto.description ?? ''}
            </span>
        </td>
    );
}

function AutoFollow({ auto }: { auto: KeyValueAutoLine }) {
    const table = useKeyValueTable();

    if (auto.follow === undefined || table.onAutoFollow === undefined) {
        return null;
    }

    return (
        <Button
            className="px-gap-tight text-2xs"
            onClick={() => {
                table.onAutoFollow?.(auto.id);
            }}
            size="sm"
            variant="ghost"
        >
            {auto.follow.label}
        </Button>
    );
}

/**
 * The rows the app adds by itself — the header its auth stands for, the content type its
 * body carries, the ones the sender lays down unasked — read but never written: they are
 * what goes out either way. Most may be left out of the request with their checkbox; the
 * locked ones stand. A row a row of the table takes over is said struck through, and a
 * value nobody knows yet is said as the one the request computes when it goes out. They
 * lay in the same grid the edited rows do, under the same head; hidden is where they start.
 */
export function KeyValueAutoRows(): ReactNode {
    const table = useKeyValueTable();
    const auto = table.autoLines;

    if (auto === undefined || !table.autoShown || auto.length === 0) {
        return null;
    }

    return (
        <>
            {auto.map((line) => (
                <AutoRow key={line.id} {...line} />
            ))}
        </>
    );
}

function AutoSwitch({ auto }: { auto: KeyValueAutoLine }) {
    const messages = useMessages('environment');
    const table = useKeyValueTable();

    if (!table.checkable) {
        return null;
    }

    return (
        <TableLeadCell>
            <Checkbox
                checked={!auto.left}
                disabled={auto.locked}
                label={messages('entrySends')}
                onCheckedChange={(checked) => {
                    table.onAutoLinesChange?.(
                        (table.autoLines ?? []).map((each) =>
                            each.id === auto.id ? { ...each, left: !checked } : each,
                        ),
                    );
                }}
            />
        </TableLeadCell>
    );
}
