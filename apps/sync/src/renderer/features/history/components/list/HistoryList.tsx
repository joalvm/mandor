import { useMessages } from '@mandor/i18n';
import { EmptyState, RowList } from '@mandor/ui';
import { useId, useMemo } from 'react';
import { useStore } from 'zustand';

import { historyStore } from '../../history-store.js';
import { historyDays } from '../../lib/history-days.js';
import { selectHistoryFor } from '../../select-history-for.js';
import { HistoryDayGroup } from './HistoryDayGroup.js';
import { HistoryToolbar } from './HistoryToolbar.js';

type HistoryListProps = {
    workspaceId: string;
};

/**
 * The sends of the workspace, newest first and grouped by day, under the bar that narrows and
 * clears them. Until the first read answers it shows no «nothing yet», because nothing yet is a
 * claim and the disk has not been asked.
 */
export function HistoryList({ workspaceId }: HistoryListProps) {
    const labels = useMessages('history');
    const headingId = useId();
    const history = useStore(historyStore, selectHistoryFor(workspaceId));
    const { filterItemPath, loaded, summaries } = history;
    const days = useMemo(
        () =>
            historyDays(
                filterItemPath === null
                    ? summaries
                    : summaries.filter((summary) => summary.itemPath === filterItemPath),
            ),
        [filterItemPath, summaries],
    );

    return (
        <section
            aria-labelledby={headingId}
            className="flex h-full min-h-0 min-w-0 flex-col"
            data-part="history-list"
        >
            <div className="flex h-header shrink-0 items-center px-pad-panel">
                <h1 className="text-lg font-semibold text-text-primary" id={headingId}>
                    {labels('title')}
                </h1>
            </div>
            <HistoryToolbar workspaceId={workspaceId} />
            <HistoryListBody
                days={days}
                empty={loaded && summaries.length === 0}
                workspaceId={workspaceId}
            />
        </section>
    );
}

function HistoryListBody({
    days,
    empty,
    workspaceId,
}: {
    days: ReturnType<typeof historyDays>;
    empty: boolean;
    workspaceId: string;
}) {
    const labels = useMessages('history');

    if (empty) {
        return (
            <EmptyState description={labels('empty')} icon="send" title={labels('emptyTitle')} />
        );
    }

    return (
        <RowList className="min-h-0 flex-1 overflow-y-auto" label={labels('list')}>
            {days.map((day) => (
                <HistoryDayGroup
                    key={day.day}
                    summaries={day.summaries}
                    workspaceId={workspaceId}
                />
            ))}
        </RowList>
    );
}
