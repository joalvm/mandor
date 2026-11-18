import type { ErrorCode } from '@mandor/ipc';
import { fireAndForget, registerCommand, type ShellStore } from '@mandor/shell';

import { openDocPreview } from './lib/open-doc-preview.js';
import { revertDoc } from './lib/revert-doc.js';
import { shownDoc } from './lib/shown-doc.js';

const CATEGORY = 'commands:categoryDoc';

/**
 * What can be done to the doc in front. Both commands answer to the file and not to the tab, so
 * they read the same whether the editor or the preview is the one being looked at.
 *
 * The failure of a revert is a failure of something the reader asked for, so it is told where
 * the reader is looking: the caller hands in the way to say it, because a command is not React.
 */
export function registerDocCommands(onFailure: (code: ErrorCode) => void): () => void {
    const undo = [
        registerCommand({
            category: CATEGORY,
            icon: 'duplicate',
            id: 'doc.preview',
            run: preview,
            title: 'commands:previewDoc',
            when: isDocShown,
        }),
        registerCommand({
            category: CATEGORY,
            icon: 'refresh',
            id: 'doc.revert',
            run: (state) => {
                revert(state, onFailure);
            },
            title: 'commands:revertDoc',
            when: isDocShown,
        }),
    ];

    return () => {
        for (const each of undo) {
            each();
        }
    };
}

function isDocShown(state: ShellStore): boolean {
    return shownDoc(state) !== null;
}

function preview(state: ShellStore): void {
    const resource = shownDoc(state);

    if (resource !== null) {
        openDocPreview(resource);
    }
}

function revert(state: ShellStore, onFailure: (code: ErrorCode) => void): void {
    const resource = shownDoc(state);

    if (resource === null) {
        return;
    }

    fireAndForget(
        revertDoc(resource).then((result) => {
            if (!result.ok) {
                onFailure(result.error.code);
            }
        }),
    );
}
