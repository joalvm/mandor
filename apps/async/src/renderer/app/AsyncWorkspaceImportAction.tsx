import { ImportDialogAction } from '@mandor/exchange';
import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { openNewWorkspace } from '@mandor/workspace';

/**
 * Importing a workspace is Async's door in the list of workspaces: the dialog is shared, the
 * format and the words about it are Async's, and what comes out is a workspace of its own, which
 * opens.
 */
export function AsyncWorkspaceImportAction() {
    const messages = useMessages('async');

    return (
        <ImportDialogAction
            formats={[{ label: 'Mandor', hint: messages('importWorkspaceHint'), input: 'files' }]}
            onImported={({ workspaceId }) => {
                fireAndForget(openNewWorkspace(workspaceId));
            }}
            scope="workspace"
        />
    );
}
