import { useMessages } from '@mandor/i18n';
import { useShellStore } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { useEnvironmentsRead } from '../../hooks/useEnvironments.js';
import { openManagedEnvironments } from '../../managed-environments.js';

/**
 * The one door to the environments of the workspace the window is on, beside the origin in the
 * title bar: where they are created, renamed, filled and deleted. Whatever picks one elsewhere
 * only chooses.
 *
 * It is also what brings them in: it stays in the title bar for as long as the window is on a
 * workspace, so whatever reads the environments elsewhere — a connection, its settings, the
 * dialog — finds them read, also right after a restart.
 */
export function ManageEnvironmentsButton() {
    const messages = useMessages('environment');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);

    useEnvironmentsRead();

    return (
        <IconButton
            disabled={workspaceId === null}
            icon="environment"
            label={messages('manage')}
            onClick={() => {
                if (workspaceId !== null) {
                    openManagedEnvironments(workspaceId, null);
                }
            }}
        />
    );
}
