import { useMessages } from '@mandor/i18n';
import type { UpdatePhase, UpdateState } from '@mandor/ipc';
import { Button } from '@mandor/ui';
import type { ComponentType, PropsWithChildren } from 'react';
import { useStore } from 'zustand';

import { useUpdateReadyToast } from '../../hooks/useUpdateReadyToast.js';
import { downloadUpdate, installUpdate, openUpdatePage } from '../../lib/update-actions.js';
import { updateStore } from '../../update-store.js';

type Messages = ReturnType<typeof useMessages<'updates'>>;

type PhaseLineProps = { messages: Messages; state: UpdateState };

/**
 * The update in the status line, only while there is something to do or to wait for: a version
 * coming down, one found, one ready. An install that cannot update, and every moment of looking
 * or failing, leave the line as it was.
 */
export function UpdateStatus() {
    const messages = useMessages('updates');
    const state = useStore(updateStore, (current) => current.state);

    useUpdateReadyToast();

    if (state === undefined || state.support === 'unsupported') {
        return null;
    }

    const Line = PHASE_LINES[state.phase];

    if (Line === null) {
        return null;
    }

    return <Line messages={messages} state={state} />;
}

function StatusLine({ children }: PropsWithChildren) {
    return (
        <div className="flex items-center gap-gap-control" data-part="update-status">
            {children}
        </div>
    );
}

/** A version found: an install that can update takes it, any other sends to the page. */
function FoundVersion({ messages, state }: PhaseLineProps) {
    const byHand = state.support === 'manual-only';

    if (state.next === undefined) {
        return null;
    }

    return (
        <StatusLine>
            <span className="text-xs text-text-secondary">
                {messages('statusAvailable', { version: state.next.version })}
            </span>
            <Button onClick={byHand ? openUpdatePage : downloadUpdate} size="sm" variant="chrome">
                {byHand ? messages('takeIt') : messages('download')}
            </Button>
        </StatusLine>
    );
}

function DownloadProgress({ messages, state }: PhaseLineProps) {
    return (
        <StatusLine>
            <span className="text-xs text-text-secondary">
                {messages('statusDownloading', { progress: state.progress ?? 0 })}
            </span>
        </StatusLine>
    );
}

function RestartToInstall({ messages }: PhaseLineProps) {
    return (
        <StatusLine>
            <Button onClick={installUpdate} size="sm" variant="chrome">
                {messages('restart')}
            </Button>
        </StatusLine>
    );
}

/** What the line says in each phase: resting, looking and failing leave it as it was. */
const PHASE_LINES: Readonly<Record<UpdatePhase, ComponentType<PhaseLineProps> | null>> = {
    idle: null,
    checking: null,
    available: FoundVersion,
    downloading: DownloadProgress,
    ready: RestartToInstall,
    error: null,
};
