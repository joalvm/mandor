import { useMessages } from '@mandor/i18n';
import { useShellStore } from '@mandor/shell';
import { IconButton } from '@mandor/ui';
import type { ReactNode } from 'react';

type ImportIconDoorProps = {
    onOpen: () => void;
};

/**
 * The door of a collection: an icon beside the heading of the section, next to the one that makes
 * a collection. It waits for a workspace, because the collection it brings in has nowhere to go
 * before one is open.
 */
export function ImportIconDoor({ onOpen }: ImportIconDoorProps): ReactNode {
    const messages = useMessages('import');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    return (
        <IconButton
            disabled={workspaceId === null}
            disabledReason={messages('title')}
            icon="import"
            label={messages('title')}
            onClick={onOpen}
            size="sm"
        />
    );
}
