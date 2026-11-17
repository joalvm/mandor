import type { ErrorCode } from '@mandor/ipc';
import { useMessages } from '@mandor/i18n';
import { useToast, type ToastRequest } from '@mandor/ui';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { useCallback, useEffect } from 'react';

import { asyncBridge } from '../../../app/async-bridge.js';
import { connectionsStore } from '../connections-store.js';
import { selectRecordingFor } from '../selectors.js';
import { useConnectionsStore } from './useConnectionsStore.js';

type UseConnectionRecordingInput = {
    connectionId: string;
    /** What the save dialog suggests as the name of the file. */
    connectionName: string;
};

/**
 * What the toolbar of one connection knows about its recording. The recorder lives in main —
 * it is the only place that survives the caps of the timeline — and its state arrives as a
 * push; what this asks for itself is the seed at mount time, because a recording outlives the
 * tab it was started from and the bar has to say so the moment the tab comes back.
 */
export function useConnectionRecording({
    connectionId,
    connectionName,
}: UseConnectionRecordingInput): {
    recording: { active: boolean; entries: number };
    onRecordToggle: () => void;
} {
    const messages = useMessages('connections');
    const fail = useFailureToast();
    const { notify } = useToast();
    const recording = useConnectionsStore(selectRecordingFor(connectionId));

    useEffect(() => {
        let cancelled = false;

        fireAndForget(
            asyncBridge.record.status({ connectionId }).then((answer) => {
                if (!cancelled && answer.ok && answer.value.active) {
                    connectionsStore.getState().setRecording(connectionId, answer.value);
                }
            }),
        );

        return () => {
            cancelled = true;
        };
    }, [connectionId]);

    const onRecordToggle = useCallback((): void => {
        const { active } = selectRecordingFor(connectionId)(connectionsStore.getState());

        if (active) {
            fireAndForget(
                stopOf({
                    connectionId,
                    savedTitle: messages('recordingSaved'),
                    openLabel: messages('openFolder'),
                    fail,
                    notify,
                }),
            );

            return;
        }

        fireAndForget(startOf({ connectionId, connectionName, fail }));
    }, [connectionId, connectionName, fail, messages, notify]);

    return { onRecordToggle, recording };
}

type ToggleInput = {
    connectionId: string;
    /** Tells a refused start or stop in the words of its code. */
    fail: (code: ErrorCode) => void;
    notify: (request: ToastRequest) => void;
    /** What the interface says where the file is offered, in its own words. */
    savedTitle: string;
    openLabel: string;
};

async function startOf(input: {
    connectionId: string;
    connectionName: string;
    fail: (code: ErrorCode) => void;
}): Promise<void> {
    const picked = await asyncBridge.record.pick({
        suggestedName: `${input.connectionName}.jsonl`,
    });

    if (!picked.ok || picked.value.path === null) {
        if (!picked.ok) {
            input.fail(picked.error.code);
        }

        return;
    }

    const started = await asyncBridge.record.start({
        connectionId: input.connectionId,
        path: picked.value.path,
    });

    if (!started.ok) {
        input.fail(started.error.code);
    }
}

async function stopOf(input: ToggleInput): Promise<void> {
    const stopped = await asyncBridge.record.stop({ connectionId: input.connectionId });

    if (!stopped.ok) {
        input.fail(stopped.error.code);

        return;
    }

    input.notify({
        action: {
            label: input.openLabel,
            onSelect: () => {
                fireAndForget(asyncBridge.record.reveal({ path: stopped.value.path }));
            },
        },
        title: input.savedTitle,
        tone: 'success',
    });
}
