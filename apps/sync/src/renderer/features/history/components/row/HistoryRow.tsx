import { useLanguage, useMessages } from '@mandor/i18n';
import type { HistorySummary } from '@mandor/schema';
import { Checkbox, cn, ListRow, RowLabel } from '@mandor/ui';
import { memo } from 'react';
import { useStore } from 'zustand';

import { formatDuration, statusFamilyOf } from '../../../../response/lib/format-response.js';
import { STATUS_TONE } from '../../../../response/lib/status-tone.js';
import { historyStore } from '../../history-store.js';
import { selectHistoryFor } from '../../select-history-for.js';
import { formatSentTime } from '../../lib/format-sent-time.js';
import { outcomeText } from '../../lib/outcome-text.js';

type HistoryRowProps = {
    summary: HistorySummary;
    workspaceId: string;
};

const FACT = 'shrink-0 tabular-nums text-xs';

/**
 * One send of the list: what it asked, how it ended and when. Taking the row opens the send in
 * the detail; the box at its start is the other thing, picking it to compare or delete. The box
 * is no tab stop of its own — the row is — so from the keyboard Enter opens the send and space
 * picks it, the way a click on the box does.
 */
export const HistoryRow = memo(function HistoryRow({ summary, workspaceId }: HistoryRowProps) {
    const labels = useMessages('history');
    const language = useLanguage();
    const open = useStore(
        historyStore,
        (state) => selectHistoryFor(workspaceId)(state).openId === summary.id,
    );
    const picked = useStore(historyStore, (state) =>
        selectHistoryFor(workspaceId)(state).selected.includes(summary.id),
    );
    const { outcome } = summary;
    const fault = outcome.kind === 'failure' || outcome.graphqlErrors > 0;
    const tone =
        outcome.kind === 'response' && !fault
            ? STATUS_TONE[statusFamilyOf(outcome.status)]
            : 'text-text-error';

    return (
        <ListRow
            className="px-pad-panel"
            onSelect={(activation) => {
                if (activation.space === true) {
                    historyStore.getState().toggleSelected(workspaceId, summary.id);

                    return;
                }

                historyStore.getState().setOpen(workspaceId, summary.id);
            }}
            selected={open}
        >
            <Checkbox
                checked={picked}
                label={labels('pickToCompare', { method: summary.method, url: summary.url })}
                onCheckedChange={() => {
                    historyStore.getState().toggleSelected(workspaceId, summary.id);
                }}
                onClick={(event) => {
                    event.stopPropagation();
                }}
            />
            <span className={cn(FACT, 'font-semibold text-text-secondary')}>{summary.method}</span>
            <RowLabel>{summary.url}</RowLabel>
            <span
                className={cn(FACT, 'font-semibold', tone)}
                data-fault={fault}
                data-part="history-outcome"
            >
                {outcomeText(summary)}
            </span>
            <HistoryDuration outcome={outcome} />
            <span className={cn(FACT, 'text-text-secondary')}>
                {formatSentTime(summary.sentAt, language)}
            </span>
        </ListRow>
    );
});

function HistoryDuration({ outcome }: { outcome: HistorySummary['outcome'] }) {
    if (outcome.kind !== 'response') {
        return null;
    }

    return (
        <span className={cn(FACT, 'text-text-secondary')}>{formatDuration(outcome.totalMs)}</span>
    );
}
