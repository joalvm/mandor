import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { ConfirmDialog } from '@mandor/ui';
import { useStore } from 'zustand';

import { docsStore } from '../../docs-store.js';
import { deleteDoc } from '../../lib/delete-doc.js';

type DocDeleteDialogProps = { workspaceId: string };

/**
 * The one question before a doc leaves the workspace. It stands beside the list and not in a
 * row, because the row that asked may scroll out of the window. It names the doc the way the
 * row does, by its title.
 */
export function DocDeleteDialog({ workspaceId }: DocDeleteDialogProps) {
    const messages = useMessages('docs');
    const deleting = useStore(docsStore, (state) => state.deleting);
    const title = useStore(
        docsStore,
        (state) => state.docs.find((doc) => doc.name === state.deleting)?.title ?? '',
    );

    function close(): void {
        docsStore.getState().setDeleting(null);
    }

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={messages('deleteCancel')}
            confirmLabel={messages('deleteConfirm')}
            description={messages('deleteBody', { name: title })}
            onCancel={close}
            onConfirm={() => {
                close();

                if (deleting !== null) {
                    fireAndForget(deleteDoc(workspaceId, deleting));
                }
            }}
            onOpenChange={(open) => {
                if (!open) {
                    close();
                }
            }}
            open={deleting !== null}
            title={messages('deleteTitle')}
        />
    );
}
