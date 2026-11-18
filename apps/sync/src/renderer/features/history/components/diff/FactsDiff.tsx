import { useMessages } from '@mandor/i18n';
import { cn } from '@mandor/ui';

import { factText } from '../../lib/fact-text.js';
import { DiffTable } from './DiffTable.js';
import type { FactKey, FactRow } from '../../lib/response-diff.js';

type FactsDiffProps = {
    facts: readonly FactRow[];
};

const LABEL_OF = {
    bodyBytes: 'factSize',
    status: 'factStatus',
    totalMs: 'factTime',
    version: 'factVersion',
} as const satisfies Record<FactKey, string>;

/** The numbers a reader looks at first, one line each, with the line tinted when it moved. */
export function FactsDiff({ facts }: FactsDiffProps) {
    const labels = useMessages('history');

    return (
        <DiffTable label={labels('diffSummary')}>
            {facts.map((fact) => (
                <FactLine fact={fact} key={fact.key} />
            ))}
        </DiffTable>
    );
}

function FactLine({ fact }: { fact: FactRow }) {
    const labels = useMessages('history');

    return (
        <tr
            className={cn(!fact.same && 'bg-surface-warning-tint')}
            data-change={fact.same ? 'same' : 'changed'}
            data-part="fact-row"
        >
            <th className="text-text-secondary" scope="row">
                {labels(LABEL_OF[fact.key])}
                <ChangedNotice same={fact.same} />
            </th>
            <td className="tabular-nums">{factText(fact.key, fact.before)}</td>
            <td className="tabular-nums">{factText(fact.key, fact.after)}</td>
        </tr>
    );
}

function ChangedNotice({ same }: { same: boolean }) {
    const labels = useMessages('history');

    if (same) {
        return null;
    }

    return <span className="sr-only">{labels('stateChanged')}</span>;
}
