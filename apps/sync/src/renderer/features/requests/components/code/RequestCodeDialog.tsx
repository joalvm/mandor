import { useMessages } from '@mandor/i18n';
import { SNIPPET_TARGETS, type SnippetTarget } from '@mandor/schema';
import { CodeEditor, Dialog, DialogBody, IconButton, Select, type EditorOptions } from '@mandor/ui';
import type { ReactNode } from 'react';

import type { SnippetState } from '../../hooks/useRequestSnippet.js';
import { snippetFailure, snippetLeftOutFile } from '../../lib/snippet-state.js';
import { SNIPPET_TARGET_LABELS } from '../../lib/snippet-target-label.js';
import { SNIPPET_TARGET_LANGUAGES } from '../../lib/snippet-target-language.js';

/** A viewer, not an editor: the code is read and copied, nobody types here. */
const OPTIONS: EditorOptions = { lineNumbers: 'on', readOnly: true, wordWrap: 'on' };

const TARGET_OPTIONS = SNIPPET_TARGETS.map((target) => ({
    label: SNIPPET_TARGET_LABELS[target],
    value: target,
}));

type RequestCodeDialogProps = {
    onCopy: () => void;
    onOpenChange: (open: boolean) => void;
    onTargetChange: (target: SnippetTarget) => void;
    open: boolean;
    snippet: SnippetState | null;
    target: SnippetTarget;
};

type CodeViewProps = { snippet: SnippetState | null; target: SnippetTarget };

/**
 * What the code area holds: the code in the colors of its language, a wait, or what went wrong.
 * The code takes all the height the dialog has left.
 */
function CodeView({ snippet, target }: CodeViewProps): ReactNode {
    const errors = useMessages('errors');
    const labels = useMessages('requests');
    const failure = snippetFailure(snippet);

    if (snippet?.state === 'ready') {
        return (
            <div className="min-h-0 min-w-0 flex-1" data-part="request-code-view">
                <CodeEditor
                    labels={{
                        editor: labels('codeEditor'),
                    }}
                    language={SNIPPET_TARGET_LANGUAGES[target]}
                    modelKey="request-code"
                    options={OPTIONS}
                    value={snippet.code}
                />
            </div>
        );
    }

    return (
        <p className="text-sm text-text-secondary" data-part="request-code-status">
            {failure === null ? labels('codeLoading') : errors(failure)}
        </p>
    );
}

/**
 * The request on screen written as code, in the language the person picks. Reading it is the
 * point: the code is shown with the secrets already hidden, and the glyph beside the language
 * hands it to the clipboard, so the dialog needs no footer.
 */
export function RequestCodeDialog({
    onCopy,
    onOpenChange,
    onTargetChange,
    open,
    snippet,
    target,
}: RequestCodeDialogProps): ReactNode {
    const labels = useMessages('requests');
    const leftOutFile = snippetLeftOutFile(snippet);

    return (
        // modal-policy: short-config-form — one choice, the language; the code is read, not typed.
        <Dialog
            closeLabel={labels('authClose')}
            onOpenChange={onOpenChange}
            open={open}
            title={labels('codeTitle')}
        >
            <DialogBody>
                <div
                    className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-control"
                    data-part="request-code"
                >
                    <div
                        className="flex items-center justify-between gap-gap-control"
                        data-part="request-code-bar"
                    >
                        <Select
                            className="w-56"
                            label={labels('codeTarget')}
                            onValueChange={onTargetChange}
                            options={TARGET_OPTIONS}
                            value={target}
                        />
                        <IconButton
                            disabled={snippet?.state !== 'ready'}
                            icon="copy"
                            label={labels('codeCopy')}
                            onClick={onCopy}
                        />
                    </div>
                    <CodeView snippet={snippet} target={target} />
                    <p className="text-xs text-text-secondary">{labels('codeRedacted')}</p>
                    <LeftOutNotice file={leftOutFile} />
                </div>
            </DialogBody>
        </Dialog>
    );
}

function LeftOutNotice({ file }: { file: string | null }) {
    const labels = useMessages('requests');

    if (file === null) {
        return null;
    }

    return <p className="text-xs text-text-secondary">{labels('codeLeftOutFile', { file })}</p>;
}
