import { useMessages } from '@mandor/i18n';
import type { HistoryEntry } from '@mandor/schema';
import { EmptyState } from '@mandor/ui';
import { useMemo } from 'react';

import { responseDiff } from '../../lib/response-diff.js';
import { answerOf } from '../../lib/answer-of.js';
import { BodyDiff } from './BodyDiff.js';
import { DiffSection } from './DiffSection.js';
import { DiffSends } from './DiffSends.js';
import { FactsDiff } from './FactsDiff.js';
import { HeadersDiff } from './HeadersDiff.js';

type HistoryDiffViewProps = {
    /** The older send first. */
    entries: readonly [HistoryEntry, HistoryEntry];
};

/**
 * Two sends compared once both are read: who sent what, then the answers set side by side. A
 * send that ended without an answer has nothing to set against, and the view says so instead of
 * drawing half a comparison.
 */
export function HistoryDiffView({ entries }: HistoryDiffViewProps) {
    const labels = useMessages('history');
    const [earlier, later] = entries;
    const diff = useMemo(() => {
        const before = answerOf(earlier);
        const after = answerOf(later);

        return before === null || after === null ? null : responseDiff(before, after);
    }, [earlier, later]);

    if (diff === null) {
        return (
            <EmptyState
                description={labels('diffNoResponse')}
                icon="warning"
                title={labels('diffNoResponseTitle')}
            />
        );
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-part="history-diff-view">
            <DiffSends earlier={earlier} later={later} />
            <div className="min-h-0 flex-1 overflow-y-auto">
                <DiffSection title={labels('diffSummary')}>
                    <FactsDiff facts={diff.facts} />
                </DiffSection>
                <DiffSection title={labels('diffHeaders')}>
                    <HeadersDiff rows={diff.headers} />
                </DiffSection>
                <DiffSection title={labels('diffBody')}>
                    <BodyDiff change={diff.body} />
                </DiffSection>
            </div>
        </div>
    );
}
