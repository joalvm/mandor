import { useLanguage } from '@mandor/i18n';
import type { HistorySummary } from '@mandor/schema';
import { useId } from 'react';

import { formatSentDay } from '../../lib/format-sent-time.js';
import { HistoryRow } from '../row/HistoryRow.js';

type HistoryDayGroupProps = {
    summaries: readonly HistorySummary[];
    workspaceId: string;
};

/** The sends of one day under the name of the day: the list reads as a log, newest on top. */
export function HistoryDayGroup({ summaries, workspaceId }: HistoryDayGroupProps) {
    const language = useLanguage();
    const headingId = useId();
    const [first] = summaries;

    return (
        <div aria-labelledby={headingId} data-part="history-day" role="group">
            <div
                className="flex h-section items-center px-pad-panel text-xs text-text-secondary"
                id={headingId}
            >
                {first === undefined ? '' : formatSentDay(first.sentAt, language)}
            </div>
            {summaries.map((summary) => (
                <HistoryRow key={summary.id} summary={summary} workspaceId={workspaceId} />
            ))}
        </div>
    );
}
