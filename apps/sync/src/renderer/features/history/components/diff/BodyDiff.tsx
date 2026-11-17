import { useMessages } from '@mandor/i18n';
import { DiffCodeEditor } from '@mandor/ui';

import { bodyNoteOf, type BodyChange } from '../../lib/body-diff.js';

type BodyDiffProps = {
    change: BodyChange;
};

const NOTE = 'px-pad-panel pb-gap-section text-sm text-text-secondary';

/**
 * The body of the two responses. Text goes into the diff editor of the app, read only, the
 * earlier send on the left; the lines that moved are the editor's to mark. A body that is not
 * text, or that was too large to read, only says whether the two match.
 */
export function BodyDiff({ change }: BodyDiffProps) {
    const labels = useMessages('history');

    if (change.kind !== 'text') {
        return (
            <p className={NOTE} data-part="body-diff">
                {labels(bodyNoteOf(change))}
            </p>
        );
    }

    return (
        <div
            className="mx-pad-panel mb-gap-section h-96 min-w-0 overflow-hidden rounded-md bg-surface-sunken"
            data-part="body-diff"
        >
            <DiffCodeEditor
                labels={{
                    editor: labels('diffBody'),
                    modified: labels('diffLater'),
                    original: labels('diffEarlier'),
                }}
                language={change.language}
                modified={change.after}
                original={change.before}
                readOnly
            />
        </div>
    );
}
