import { useMessages } from '@mandor/i18n';
import { useFailureToast } from '@mandor/shell';
import { EmptyState } from '@mandor/ui';
import { useEffect, useEffectEvent } from 'react';
import { useStore } from 'zustand';

import { historyStore } from '../../history-store.js';
import { useHistoryEntry } from '../../hooks/useHistoryEntry.js';
import { readFailure } from '../../lib/diff-failure.js';
import { selectHistoryFor } from '../../select-history-for.js';
import { HistoryEntryView } from './HistoryEntryView.js';

type HistoryDetailProps = {
    resource: string;
    workspaceId: string;
};

/**
 * The send the list has open. It reads the file when the row changes and not before: the list
 * carries no body, so what it holds says nothing about this. A send that cannot be read says so
 * in the place of the detail and as a notice, since the row that led here is still on screen.
 */
export function HistoryDetail({ resource, workspaceId }: HistoryDetailProps) {
    const labels = useMessages('history');
    const notifyFailure = useEffectEvent(useFailureToast());
    const openId = useStore(historyStore, (state) => selectHistoryFor(workspaceId)(state).openId);
    const read = useHistoryEntry(workspaceId, openId);
    const failure = readFailure(read);

    useEffect(() => {
        if (failure !== null) {
            notifyFailure(failure);
        }
    }, [failure]);

    if (openId === null) {
        return (
            <EmptyState
                description={labels('detailEmpty')}
                icon="send"
                title={labels('detailEmptyTitle')}
            />
        );
    }

    if (failure !== null) {
        return (
            <EmptyState
                description={labels('entryGone')}
                icon="warning"
                title={labels('entryGoneTitle')}
            />
        );
    }

    if (read.state !== 'ready') {
        return null;
    }

    return <HistoryEntryView entry={read.entry} resource={resource} />;
}
