import { useMessages } from '@mandor/i18n';
import { cn } from '@mandor/ui';

import { DiffTable } from './DiffTable.js';
import type { HeaderChange, HeaderDiffRow } from '../../lib/header-diff.js';

type HeadersDiffProps = {
    rows: readonly HeaderDiffRow[];
};

const TINT_OF: Readonly<Record<HeaderChange, string>> = {
    added: 'bg-surface-success-tint',
    changed: 'bg-surface-warning-tint',
    removed: 'bg-surface-error-tint',
    same: '',
};

const STATE_OF = {
    added: 'stateAdded',
    changed: 'stateChanged',
    removed: 'stateRemoved',
    same: 'stateSame',
} as const satisfies Record<HeaderChange, string>;

/** The headers of both responses, one line each, tinted by what became of the header. */
export function HeadersDiff({ rows }: HeadersDiffProps) {
    const labels = useMessages('history');

    if (rows.length === 0) {
        return (
            <p
                className="px-pad-panel pb-gap-section text-sm text-text-secondary"
                data-part="headers-diff"
            >
                {labels('headersNone')}
            </p>
        );
    }

    return (
        <DiffTable label={labels('diffHeaders')}>
            {rows.map((row) => (
                <tr
                    className={cn(TINT_OF[row.change])}
                    data-change={row.change}
                    data-part="header-row"
                    key={row.name.toLowerCase()}
                >
                    <th className="text-text-secondary" scope="row">
                        {row.name}
                        <span className="sr-only">{labels(STATE_OF[row.change])}</span>
                    </th>
                    <td className="whitespace-pre-wrap">{row.before.join('\n')}</td>
                    <td className="whitespace-pre-wrap">{row.after.join('\n')}</td>
                </tr>
            ))}
        </DiffTable>
    );
}
