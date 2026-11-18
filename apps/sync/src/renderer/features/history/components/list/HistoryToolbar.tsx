import { useMessages } from '@mandor/i18n';
import { Button, Select } from '@mandor/ui';
import { useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { historyStore } from '../../history-store.js';
import type { HistoryDeletion } from '../../lib/removal-of.js';
import { openComparison } from '../../lib/open-comparison.js';
import { requestPathsOf } from '../../lib/request-paths.js';
import { selectHistoryFor } from '../../select-history-for.js';
import { HistoryDeleteDialog } from '../dialog/HistoryDeleteDialog.js';

type HistoryToolbarProps = {
    workspaceId: string;
};

/** The value of «all requests» in the filter: a request path never holds a star. */
const EVERY_REQUEST = '*';

const BAND = 'flex h-header min-w-0 shrink-0 items-center gap-gap-control px-pad-panel';

/**
 * What the list can be asked to do: narrow itself to one request, delete the sends picked, or
 * clear the lot. The questions sit in a dialog, so nothing leaves the history by one click.
 */
export function HistoryToolbar({ workspaceId }: HistoryToolbarProps) {
    const labels = useMessages('history');
    const history = useStore(historyStore, selectHistoryFor(workspaceId));
    const [deleting, setDeleting] = useState<HistoryDeletion | null>(null);
    const options = useMemo(
        () => [
            { label: labels('allRequests'), value: EVERY_REQUEST },
            ...requestPathsOf(history.summaries).map((path) => ({ label: path, value: path })),
        ],
        [history.summaries, labels],
    );

    return (
        <div className={BAND} data-part="history-toolbar">
            <Select
                className="min-w-0 flex-1"
                label={labels('filterRequest')}
                onValueChange={(value) => {
                    historyStore
                        .getState()
                        .setFilter(workspaceId, value === EVERY_REQUEST ? null : value);
                }}
                options={options}
                value={history.filterItemPath ?? EVERY_REQUEST}
            />
            <Button
                disabled={history.selected.length !== 2}
                onClick={() => {
                    const [a, b] = history.selected;

                    if (a !== undefined && b !== undefined) {
                        openComparison(workspaceId, [a, b]);
                    }
                }}
                size="sm"
                variant="ghost"
            >
                {labels('compare')}
            </Button>
            <Button
                disabled={history.selected.length === 0}
                onClick={() => {
                    setDeleting('selected');
                }}
                size="sm"
                variant="ghost"
            >
                {labels('deleteSelected')}
            </Button>
            <Button
                disabled={history.summaries.length === 0}
                onClick={() => {
                    setDeleting('all');
                }}
                size="sm"
                variant="ghost"
            >
                {labels('clear')}
            </Button>
            <HistoryDeleteDialog
                deleting={deleting}
                onClose={() => {
                    setDeleting(null);
                }}
                workspaceId={workspaceId}
            />
        </div>
    );
}
