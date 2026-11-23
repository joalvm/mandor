import { useMessages } from '@mandor/i18n';
import type { SkippedScript } from '@mandor/schema';
import { EMPTY_SCRIPT_CONTEXT, visibleName } from '@mandor/script';
import { bridge, fireAndForget, useFailureToast } from '@mandor/shell';
import { Button, Dialog, DialogBody, DialogNav, DialogNavItem, DialogNavList } from '@mandor/ui';
import { useState } from 'react';

import { ScriptEditor } from './ScriptEditor.js';

const NONE: ReadonlySet<number> = new Set();

type SkippedScriptsDialogProps = {
    open: boolean;
    /** What the send left out, as main told it: a text only while the output had room for it. */
    scripts: readonly SkippedScript[];
    workspaceId: string;
    onOpenChange: (open: boolean) => void;
};

/**
 * The scripts a send left out because nobody on this machine approved them, typically after a
 * pull brought them: the list on the side, the one picked on the right, to read before approving
 * it. Its name comes with every hidden character written out, its text goes to an editor that
 * only reads and marks what hides, and nothing of either is ever drawn as markup. A text that did
 * not come along is not approved from here: nobody saw it.
 */
export function SkippedScriptsDialog({
    open,
    scripts,
    workspaceId,
    onOpenChange,
}: SkippedScriptsDialogProps) {
    const labels = useMessages('collections');
    const [chosen, setChosen] = useState(0);
    /** The scripts approved from here, by place in the list: picking another keeps the answer. */
    const [approved, setApproved] = useState(NONE);
    const shown = scripts[chosen] ?? scripts[0];

    return (
        // modal-policy: security-decision
        <Dialog
            closeLabel={labels('skippedClose')}
            onOpenChange={onOpenChange}
            open={open}
            title={labels('skippedTitle', { count: scripts.length })}
        >
            <DialogNav>
                <DialogNavList label={labels('skippedList')}>
                    {scripts.map((script, index) => (
                        <DialogNavItem
                            icon="code"
                            key={`${script.level}:${script.event}:${String(index)}`}
                            label={visibleName(script.name)}
                            onSelect={() => {
                                setChosen(index);
                            }}
                            selected={index === chosen}
                        />
                    ))}
                </DialogNavList>
            </DialogNav>
            <DialogBody>
                <SkippedScriptView
                    approved={approved.has(chosen)}
                    key={chosen}
                    modelKey={`skipped:${String(chosen)}`}
                    onApproved={() => {
                        setApproved((before) => new Set(before).add(chosen));
                    }}
                    script={shown}
                    workspaceId={workspaceId}
                />
            </DialogBody>
        </Dialog>
    );
}

type SkippedScriptViewProps = {
    approved: boolean;
    modelKey: string;
    script: SkippedScript | undefined;
    workspaceId: string;
    onApproved: () => void;
};

/** The script picked: where it sits, and its text with the button, or why its text is not here. */
function SkippedScriptView({
    approved,
    modelKey,
    script,
    workspaceId,
    onApproved,
}: SkippedScriptViewProps) {
    const labels = useMessages('collections');

    if (script === undefined) {
        return null;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-gap-control" data-part="skipped-script">
            <p className="text-xs text-text-secondary">
                {labels('skippedPlace', {
                    level: labels(`scriptLevel-${script.level}`),
                    event: script.event,
                })}
            </p>
            <SkippedSource
                approved={approved}
                modelKey={modelKey}
                onApproved={onApproved}
                script={script}
                workspaceId={workspaceId}
            />
        </div>
    );
}

type SkippedSourceProps = Omit<SkippedScriptViewProps, 'script'> & { script: SkippedScript };

function SkippedSource({
    approved,
    modelKey,
    onApproved,
    script,
    workspaceId,
}: SkippedSourceProps) {
    const labels = useMessages('collections');
    const { source } = script;

    if (source === undefined) {
        return <p>{labels('skippedNotShown', { bytes: String(script.bytes) })}</p>;
    }

    return (
        <>
            <ApproveSkipped
                approved={approved}
                onApproved={onApproved}
                script={{ ...script, source }}
                workspaceId={workspaceId}
            />
            <ScriptEditor
                context={EMPTY_SCRIPT_CONTEXT}
                event={script.event}
                modelKey={modelKey}
                readOnly
                value={source}
            />
        </>
    );
}

type ApproveSkippedProps = {
    approved: boolean;
    script: SkippedScript & { source: string };
    workspaceId: string;
    onApproved: () => void;
};

/** Approves the text shown, as it is, in its place; once main took it, it says so instead. */
function ApproveSkipped({ approved, onApproved, script, workspaceId }: ApproveSkippedProps) {
    const labels = useMessages('collections');
    const notifyFailure = useFailureToast();

    if (approved) {
        return <p className="text-xs text-text-secondary">{labels('skippedApproved')}</p>;
    }

    const { event, level, source } = script;

    return (
        <Button
            className="self-start"
            data-part="script-approve"
            onClick={() => {
                fireAndForget(
                    bridge.scripts.approve({ workspaceId, level, event, source }).then((answer) => {
                        if (!answer.ok) {
                            notifyFailure(answer.error.code);

                            return;
                        }

                        if (answer.value.approved) {
                            onApproved();
                        }
                    }),
                );
            }}
            size="sm"
            variant="secondary"
        >
            {labels('scriptApprove')}
        </Button>
    );
}
