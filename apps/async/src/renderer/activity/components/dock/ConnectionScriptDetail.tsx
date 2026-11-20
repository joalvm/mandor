import { ReviewSkippedScripts, ScriptMark, ScriptMarkText } from '@mandor/collections';
import { ForgetScriptVariablesButton } from '@mandor/env';
import { useMessages, useScriptWords } from '@mandor/i18n';
import type { WsScriptNote } from '@mandor/ipc';
import { showConsole, useShellStore } from '@mandor/shell';
import { Button } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

import type { ConnectionScriptEntry } from '../../activity-entry.js';
import { scriptErrorPlace, scriptNoteFigures } from '../../lib/script-note-words.js';
import { DockBand } from './DockBand.js';

type CountKey = 'scriptDroppedDetail' | 'scriptSwitchedOff';

type ConnectionScriptDetailProps = {
    entry: ConnectionScriptEntry;
};

/**
 * What the scripts of the connection said at one moment, read whole in the dock: its figures,
 * where the one that broke stopped, and each thing they changed on the way, a line apiece. What
 * they wrote is the console's: the dock opens it instead of copying it.
 */
export function ConnectionScriptDetail({ entry }: ConnectionScriptDetailProps) {
    const labels = useMessages('connections');
    const note = entry.detail;
    const counts: [CountKey, number][] = [
        ['scriptDroppedDetail', note.dropped],
        ['scriptSwitchedOff', note.switchedOff],
    ];

    return (
        <>
            <DockBand entry={entry} />
            <div
                className="flex min-h-0 flex-1 flex-col gap-gap-group overflow-auto px-pad-panel py-pad-control"
                data-format="text"
                data-part="activity-detail"
            >
                <p className="text-sm text-text-secondary">{scriptNoteFigures(note, labels)}</p>
                <BrokeMark note={note} />
                <DestinationMark note={note} />
                <PollingMark note={note} />
                <SkippedMark note={note} />
                <Mark shown={note.withheld.length > 0}>
                    {labels('scriptWithheld', { names: note.withheld.join(', ') })}
                </Mark>
                {counts.map(([key, count]) => (
                    <Mark key={key} shown={count > 0}>
                        {labels(key, { count })}
                    </Mark>
                ))}
                <p className="flex items-center">
                    <Button onClick={showConsole} size="sm">
                        {labels('openConsole')}
                    </Button>
                </p>
            </div>
        </>
    );
}

type NoteProps = { note: WsScriptNote };

/** The error that ended the run, in the words of the interface, and where it stopped. */
function BrokeMark({ note }: NoteProps) {
    const labels = useMessages('connections');
    const words = useScriptWords();

    if (note.error === undefined) {
        return null;
    }

    return (
        <p className="flex min-w-0 flex-col text-sm text-text-error" data-part="script-error">
            <span className="break-words">{words.error(note.error)}</span>
            <span className="text-xs text-text-secondary">{scriptErrorPlace(note, labels)}</span>
        </p>
    );
}

/** The secrets stayed behind, and the way to have them go is to name the host in the environment. */
function DestinationMark({ note }: NoteProps) {
    const labels = useMessages('connections');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    if (note.secretsOff !== 'destination' || workspaceId === null) {
        return null;
    }

    return (
        <ScriptMark mark="destination">
            <ScriptMarkText>
                {labels('scriptSecretsOffDestination')}
                <span className="text-xs text-text-secondary">
                    {labels('scriptSecretsOffDestinationHint')}
                </span>
            </ScriptMarkText>
            <ForgetScriptVariablesButton workspaceId={workspaceId} />
        </ScriptMark>
    );
}

/** A Socket.IO that may poll follows a redirect with every header: it went without secrets. */
function PollingMark({ note }: NoteProps) {
    const labels = useMessages('connections');

    if (note.secretsOff !== 'polling') {
        return null;
    }

    return (
        <ScriptMark mark="polling">
            <ScriptMarkText>{labels('scriptSecretsOffPolling')}</ScriptMarkText>
        </ScriptMark>
    );
}

/** The scripts left out for want of an approval, with the way to read them and approve them. */
function SkippedMark({ note }: NoteProps) {
    const labels = useMessages('connections');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    if (note.skipped.length === 0) {
        return null;
    }

    return (
        <ScriptMark mark="skipped">
            <ScriptMarkText>
                {labels('scriptSkippedDetail', { count: note.skipped.length })}
            </ScriptMarkText>
            <ReviewOf note={note} workspaceId={workspaceId} />
        </ScriptMark>
    );
}

type ReviewOfProps = NoteProps & { workspaceId: string | null };

/** Approving needs the workspace the connection is in: without one, the mark only tells. */
function ReviewOf({ note, workspaceId }: ReviewOfProps) {
    if (workspaceId === null) {
        return null;
    }

    return <ReviewSkippedScripts scripts={note.skipped} workspaceId={workspaceId} />;
}

type MarkProps = PropsWithChildren<{ shown: boolean }>;

/** A line of the detail that is there only when what it counts is not zero. */
function Mark({ children, shown }: MarkProps) {
    if (!shown) {
        return null;
    }

    return (
        <ScriptMark>
            <ScriptMarkText>{children}</ScriptMarkText>
        </ScriptMark>
    );
}
