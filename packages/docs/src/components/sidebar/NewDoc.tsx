import { useMessages } from '@mandor/i18n';
import { fireAndForget, useShellStore, useUnfoldSection } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { createDoc } from '../../lib/create-doc.js';

/**
 * Makes one doc. It sits in the header of the section because that is the one place that is
 * there whether or not the folder holds anything, and an empty `docs/` is exactly when a way
 * to fill it is needed. A folded section opens first, so the row being named is there to see.
 */
export function NewDoc() {
    const messages = useMessages('docs');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const unfold = useUnfoldSection();

    return (
        <span data-part="new-doc">
            <IconButton
                disabled={workspaceId === null}
                disabledReason={messages('newDoc')}
                icon="add"
                label={messages('newDoc')}
                onClick={() => {
                    if (workspaceId === null) {
                        return;
                    }

                    unfold();
                    fireAndForget(createDoc(workspaceId, messages('newDoc')));
                }}
                size="sm"
            />
        </span>
    );
}
