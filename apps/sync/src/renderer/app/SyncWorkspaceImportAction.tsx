import { ImportDialogAction } from '@mandor/exchange';
import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { openNewWorkspace } from '@mandor/workspace';

/**
 * Importing a workspace is Sync's door in the list of workspaces: the dialog is shared, the formats
 * and the words about them are Sync's, and what comes out is a workspace of its own, which opens.
 */
export function SyncWorkspaceImportAction() {
    const messages = useMessages('sync');

    return (
        <ImportDialogAction
            formats={[
                { label: 'Mandor', hint: messages('importWorkspaceHint'), input: 'files' },
                { label: 'Postman', hint: messages('importWorkspacePostmanHint'), input: 'files' },
                { label: 'Insomnia', hint: messages('importInsomniaHint'), input: 'files' },
                { label: 'Bruno', hint: messages('importWorkspaceBrunoHint'), input: 'folder' },
            ]}
            onImported={({ workspaceId }) => {
                fireAndForget(openNewWorkspace(workspaceId));
            }}
            scope="workspace"
        />
    );
}
