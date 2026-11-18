import { useMessages } from '@mandor/i18n';
import { useShellStore } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { foldWorkspaceCollections } from '../../lib/fold-workspace-collections.js';

/**
 * Closes every collection and folder of the workspace at once, beside the entry that makes one.
 * A tree opened deep in many places is read again from its first level, one collection a line.
 */
export function FoldCollectionsEntry() {
    const messages = useMessages('collections');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    return (
        <IconButton
            disabled={workspaceId === null}
            disabledReason={messages('foldCollections')}
            icon="collapse-all"
            label={messages('foldCollections')}
            onClick={foldWorkspaceCollections}
        />
    );
}
