import { useMessages } from '@mandor/i18n';
import type { ListedWorkspace } from '@mandor/ipc';
import { ConfirmDialog } from '@mandor/ui';

type WorkspaceDeleteDialogProps = {
    workspace: ListedWorkspace | null;
    onCancel: () => void;
    onConfirm: (workspace: ListedWorkspace) => void;
};

/**
 * The one question before a workspace leaves: it names the exact workspace, says what goes
 * with it, and its two answers are the only way out. The date column is not part of what is
 * lost — it is when it was touched, and the dialog has no use for it.
 */
export function WorkspaceDeleteDialog({
    workspace,
    onCancel,
    onConfirm,
}: WorkspaceDeleteDialogProps) {
    const messages = useMessages('workspace');

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={messages('cancel')}
            confirmLabel={messages('deleteConfirm')}
            description={workspace === null ? '' : messages('deleteBody', { name: workspace.name })}
            onCancel={onCancel}
            onConfirm={() => {
                if (workspace !== null) {
                    onConfirm(workspace);
                }
            }}
            onOpenChange={(open) => {
                if (!open) {
                    onCancel();
                }
            }}
            open={workspace !== null}
            title={workspace === null ? '' : messages('deleteTitle', { name: workspace.name })}
        />
    );
}
