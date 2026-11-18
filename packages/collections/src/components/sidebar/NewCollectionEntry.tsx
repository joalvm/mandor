import { useMessages } from '@mandor/i18n';
import { fireAndForget, useShellStore, useUnfoldSection } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { createCollectionNode } from '../../lib/create-collection-node.js';

/**
 * Makes a collection at the top level, which is the one place no row can offer: a workspace with
 * no collection has no row to open a menu on, and that is exactly when one is needed. A folded
 * section opens first, so the row being named is there to see.
 */
export function NewCollectionEntry() {
    const messages = useMessages('collections');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const unfold = useUnfoldSection();

    return (
        <span data-part="new-collection-entry">
            <IconButton
                disabled={workspaceId === null}
                disabledReason={messages('newCollection')}
                icon="add"
                label={messages('newCollection')}
                onClick={() => {
                    if (workspaceId === null) {
                        return;
                    }

                    unfold();
                    fireAndForget(
                        createCollectionNode(workspaceId, {
                            itemKind: null,
                            name: messages('newCollection'),
                            parent: '',
                        }),
                    );
                }}
                size="md"
            />
        </span>
    );
}
