import { useMessages } from '@mandor/i18n';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { SplitHalf, SplitPane } from '@mandor/ui';
import { useEffect, useEffectEvent, useState } from 'react';

import { loadHistory } from '../../lib/load-history.js';
import { HistoryDetail } from '../detail/HistoryDetail.js';
import { HistoryList } from '../list/HistoryList.js';

type HistoryTabProps = {
    resource: string;
    workspaceId: string;
};

/**
 * The history of a workspace as a tab: the list at the left and the send it has open at the
 * right, the way the request keeps what it asks at the left and what comes back at the right.
 * The split is state of the view and is not kept.
 */
export function HistoryTab({ resource, workspaceId }: HistoryTabProps) {
    const labels = useMessages('history');
    const notifyFailure = useEffectEvent(useFailureToast());
    const [split, setSplit] = useState(40);

    useEffect(() => {
        fireAndForget(
            loadHistory(workspaceId).then((code) => {
                if (code !== null) {
                    notifyFailure(code);
                }
            }),
        );
    }, [workspaceId]);

    return (
        <SplitPane
            className="h-full min-h-0 flex-1"
            label={labels('resizeSplit')}
            onValueChange={setSplit}
            value={split}
        >
            <SplitHalf>
                <HistoryList workspaceId={workspaceId} />
            </SplitHalf>
            <SplitHalf>
                <HistoryDetail resource={resource} workspaceId={workspaceId} />
            </SplitHalf>
        </SplitPane>
    );
}
