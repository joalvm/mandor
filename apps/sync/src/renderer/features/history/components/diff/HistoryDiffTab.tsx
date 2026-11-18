import { useMessages } from '@mandor/i18n';
import { useFailureToast } from '@mandor/shell';
import { EmptyState } from '@mandor/ui';
import { useEffect, useEffectEvent } from 'react';

import { useHistoryEntry } from '../../hooks/useHistoryEntry.js';
import { diffFailure } from '../../lib/diff-failure.js';
import { inSentOrder } from '../../lib/sent-order.js';
import { HistoryDiffView } from './HistoryDiffView.js';

type HistoryDiffTabProps = {
    ids: readonly [string, string];
    workspaceId: string;
};

/**
 * Two sends of the history side by side. Both are read from disk when the tab opens, so a send
 * that was pruned in the meantime says so here and the tab draws nothing else: half a comparison
 * would read as if the other send had sent nothing. Why it failed goes out as a notice.
 */
export function HistoryDiffTab({ ids, workspaceId }: HistoryDiffTabProps) {
    const labels = useMessages('history');
    const notifyFailure = useEffectEvent(useFailureToast());
    const [firstId, secondId] = ids;
    const first = useHistoryEntry(workspaceId, firstId);
    const second = useHistoryEntry(workspaceId, secondId);
    const failure = diffFailure(first, second);

    useEffect(() => {
        if (failure !== null) {
            notifyFailure(failure);
        }
    }, [failure]);

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="history-diff">
            <div className="flex h-header shrink-0 items-center px-pad-panel">
                <h1 className="text-lg font-semibold text-text-primary">{labels('diffTitle')}</h1>
            </div>
            <DiffGone failed={failure !== null} />
            <DiffBoth first={first} second={second} />
        </div>
    );
}

function DiffGone({ failed }: { failed: boolean }) {
    const labels = useMessages('history');

    if (!failed) {
        return null;
    }

    return (
        <EmptyState
            description={labels('diffGone')}
            icon="warning"
            title={labels('diffGoneTitle')}
        />
    );
}

function DiffBoth({
    first,
    second,
}: {
    first: ReturnType<typeof useHistoryEntry>;
    second: ReturnType<typeof useHistoryEntry>;
}) {
    if (first.state !== 'ready' || second.state !== 'ready') {
        return null;
    }

    return <HistoryDiffView entries={inSentOrder(first.entry, second.entry)} />;
}
