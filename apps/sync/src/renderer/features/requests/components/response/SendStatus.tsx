import { useMessages } from '@mandor/i18n';
import { LoadingIcon } from '@mandor/icons';
import { showConsole } from '@mandor/shell';
import { Button, cn } from '@mandor/ui';
import type { PropsWithChildren } from 'react';
import { useStore } from 'zustand';

import { scriptOutputStore } from '../../lib/script-output-store.js';
import type { SendEntry, SendOutcome } from '../../responses.slice.js';
import { OpenHistoryButton } from './OpenHistoryButton.js';
import { ScriptMarks } from './ScriptMarks.js';

type SendStatusProps = {
    entry: SendEntry;
    /** Sends the same again with no script run; without it, a script that broke offers no way out. */
    onSendWithoutScripts?: (() => void) | undefined;
};

const BAND =
    'flex h-header min-w-0 shrink-0 items-center gap-gap-control px-pad-panel text-sm text-text-primary';

/**
 * What the half says while no answer is due yet, and whether it turns while it waits. A send on
 * its way is also told to the ear by the `SendAnnouncement` beside the half, so its words are
 * left out of the reading order here; the idle words are the only copy there is.
 */
const WAIT_OF_STATE = {
    idle: { heard: false, spins: false, word: 'responseIdle' },
    sending: { heard: true, spins: true, word: 'sending' },
} as const;

/**
 * Where a send stands apart from its answer. Waiting to send and sending fill the half, centred,
 * the way an empty panel says what will appear in it. A send that failed says so on the line
 * where the answer would have stood, and keeps no response of the one before under it, because
 * what the line shows is the answer to this send; a script that broke it adds what the scripts
 * wrote and the way to send it without them. Over an answer that came, it marks only what the
 * scripts changed on the way. The words of a send on its way and of a fault are heard once, from
 * the `SendAnnouncement`, and not a second time from the line.
 */
export function SendStatus({ entry, onSendWithoutScripts }: SendStatusProps) {
    const labels = useMessages('requests');

    if (entry.state === 'idle' || entry.state === 'sending') {
        const wait = WAIT_OF_STATE[entry.state];

        return (
            <div
                className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-gap-control p-pad-panel text-center text-sm text-text-secondary"
                data-part="response-summary"
                data-state={entry.state}
            >
                <WaitSpinner spins={wait.spins} />
                <span aria-hidden={wait.heard || undefined}>{labels(wait.word)}</span>
            </div>
        );
    }

    return <SendOutcomeStatus entry={entry} onSendWithoutScripts={onSendWithoutScripts} />;
}

type SendOutcomeStatusProps = Omit<SendStatusProps, 'entry'> & { entry: SendOutcome };

function SendOutcomeStatus({ entry, onSendWithoutScripts }: SendOutcomeStatusProps) {
    const sendId = entry.sendId;
    const run = useStore(scriptOutputStore, (state) =>
        sendId === undefined ? undefined : state.runs[sendId],
    );

    return (
        <div
            className="flex min-h-0 min-w-0 shrink-0 flex-col"
            data-part="send-status"
            data-state={entry.state}
        >
            <FailureBand entry={entry} onSendWithoutScripts={onSendWithoutScripts} />
            <ScriptMarks key={sendId} output={run?.output} workspaceId={run?.place.workspaceId} />
        </div>
    );
}

/**
 * A cut the user asked for is not a fault: the red is for what went wrong on its own. A long
 * fault gives way before the ways out do, so they stay whole on a narrow half.
 */
function FailureBand({ entry, onSendWithoutScripts }: SendOutcomeStatusProps) {
    const errors = useMessages('errors');
    const labels = useMessages('requests');

    if (entry.state !== 'failed') {
        return null;
    }

    const fault = entry.error !== 'request-aborted';

    return (
        <div
            className={cn(BAND, fault && 'text-text-error')}
            data-fault={fault}
            data-part="response-summary"
            data-state={entry.state}
        >
            <span aria-hidden className="min-w-0 truncate">
                {errors(entry.error)}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-gap-control">
                <SendWithoutScriptsButton
                    broke={entry.error === 'script-failed'}
                    onSend={onSendWithoutScripts}
                >
                    {labels('sendWithoutScripts')}
                </SendWithoutScriptsButton>
                <OpenConsoleButton broke={entry.error === 'script-failed'}>
                    {labels('openConsole')}
                </OpenConsoleButton>
                <OpenHistoryButton />
            </div>
        </div>
    );
}

type SendWithoutScriptsButtonProps = PropsWithChildren<{
    broke: boolean;
    onSend: (() => void) | undefined;
}>;

/** The way out of a script that broke the send: the same request again, with no script run. */
function SendWithoutScriptsButton({ broke, children, onSend }: SendWithoutScriptsButtonProps) {
    if (!broke || onSend === undefined) {
        return null;
    }

    return (
        <Button onClick={onSend} size="sm">
            {children}
        </Button>
    );
}

type OpenConsoleButtonProps = PropsWithChildren<{ broke: boolean }>;

/**
 * The way to what a broken script wrote: the console of the window, which stays put away until
 * it is asked for, as a browser keeps its own.
 */
function OpenConsoleButton({ broke, children }: OpenConsoleButtonProps) {
    if (!broke) {
        return null;
    }

    return (
        <Button onClick={showConsole} size="sm">
            {children}
        </Button>
    );
}

function WaitSpinner({ spins }: { spins: boolean }) {
    if (!spins) {
        return null;
    }

    return (
        <span className="flex size-icon-md items-center justify-center" data-spin="">
            <LoadingIcon />
        </span>
    );
}
