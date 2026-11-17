import { useMessages } from '@mandor/i18n';
import { ConfirmDialog } from '@mandor/ui';
import { useStore } from 'zustand';
import { fireAndForget } from '@mandor/shell';

import { collectionStore } from '../../collection-store.js';
import { deleteQuestion } from '../../lib/delete-question.js';
import { removeDoomedRows } from '../../lib/remove-doomed-rows.js';
import { splitDeleting } from '../../lib/split-deleting.js';

type CollectionDeleteDialogProps = { workspaceId: string };

/**
 * The one question before anything leaves the collection, however it was asked: from the menu of a
 * row or with the Delete key, for one entry or for many. It stands beside the tree and not in a
 * row, because the row that asked may scroll out of the window, and anything it held with it.
 */
export function CollectionDeleteDialog({ workspaceId }: CollectionDeleteDialogProps) {
    const messages = useMessages('collections');
    const deleting = useStore(collectionStore, (state) => state.deleting);
    const nodes = useStore(collectionStore, (state) => state.nodes);
    const doomed = splitDeleting(nodes, deleting ?? []);
    const count = doomed.nodes.length + doomed.examples.length;

    function close(): void {
        collectionStore.getState().setDeleting(null);
    }

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={messages('deleteCancel')}
            confirmLabel={messages('deleteConfirm')}
            description={deleteQuestion(doomed, messages)}
            onCancel={close}
            onConfirm={() => {
                close();
                fireAndForget(removeDoomedRows(workspaceId, doomed));
            }}
            onOpenChange={(open) => {
                if (!open) {
                    close();
                }
            }}
            open={count > 0}
            title={messages('deleteTitle')}
        />
    );
}
