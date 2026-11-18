import { fireAndForget, useFailureToast } from '@mandor/shell';
import { useCallback } from 'react';

import type { ActivityEntry } from '../../../activity/activity-entry.js';
import { asyncBridge } from '../../../app/async-bridge.js';
import { exportActivity } from '../lib/export-activity.js';

/**
 * The action the head of the timeline runs to write its entries out of the app. The channel is
 * the panel's to call — the bridge is read once, by the app — and the answer comes back
 * here: a failed write becomes a toast, a closed dialog stays silent. The entries are the
 * timeline as it stands at the moment of the click.
 */
export function useActivityExport(entries: readonly ActivityEntry[]): () => void {
    const fail = useFailureToast();

    return useCallback((): void => {
        fireAndForget(
            exportActivity(entries, asyncBridge.export.jsonl).then((code) => {
                if (code !== null) {
                    fail(code);
                }
            }),
        );
    }, [entries, fail]);
}
