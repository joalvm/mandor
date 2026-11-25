import { ReviewSkippedScripts, ScriptMark, ScriptMarkText } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import type { SkippedScript } from '@mandor/schema';

import type { ScriptOutput } from '../../../../response/lib/script-output.js';

type ScriptMarksProps = { output: ScriptOutput | undefined; workspaceId: string | undefined };

/**
 * What the scripts changed on the way out that asks something of the reader, each on a line of
 * its own; nothing when they changed nothing. A destination a script moved is told by the console.
 */
export function ScriptMarks({ output, workspaceId }: ScriptMarksProps) {
    if (output === undefined) {
        return null;
    }

    return (
        <div className="flex min-w-0 shrink-0 flex-col px-pad-panel" data-part="script-marks">
            <SkippedMark scripts={output.skipped} workspaceId={workspaceId} />
            <HeldMark held={output.heldAt !== undefined} />
        </div>
    );
}

type SkippedMarkProps = { scripts: readonly SkippedScript[]; workspaceId: string | undefined };

/** The scripts the send left out, with the way to read them and approve them where they are. */
function SkippedMark({ scripts, workspaceId }: SkippedMarkProps) {
    const labels = useMessages('requests');

    if (scripts.length === 0) {
        return null;
    }

    return (
        <ScriptMark>
            <ScriptMarkText>{labels('scriptsSkipped', { count: scripts.length })}</ScriptMarkText>
            <ReviewOf scripts={scripts} workspaceId={workspaceId} />
        </ScriptMark>
    );
}

/** Approving needs the workspace of the send: without it, the mark only tells. */
function ReviewOf({ scripts, workspaceId }: SkippedMarkProps) {
    if (workspaceId === undefined) {
        return null;
    }

    return <ReviewSkippedScripts scripts={scripts} workspaceId={workspaceId} />;
}

/** A redirect stopped where going on would have taken a secret along. */
function HeldMark({ held }: { held: boolean }) {
    const labels = useMessages('requests');

    if (!held) {
        return null;
    }

    return (
        <ScriptMark>
            <ScriptMarkText>{labels('redirectHeld')}</ScriptMarkText>
        </ScriptMark>
    );
}
