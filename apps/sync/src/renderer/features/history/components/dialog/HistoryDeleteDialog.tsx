import { useMessages } from '@mandor/i18n';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { ConfirmDialog } from '@mandor/ui';
import { useStore } from 'zustand';

import { historyStore } from '../../history-store.js';
import { removalOf, type HistoryDeletion } from '../../lib/removal-of.js';
import { removeHistory } from '../../lib/remove-history.js';
import { selectHistoryFor } from '../../select-history-for.js';

type HistoryDeleteDialogProps = {
    deleting: HistoryDeletion | null;
    onClose: () => void;
    workspaceId: string;
};

/**
 * The one question before a send leaves the history, for the ones picked and for all of them.
 * A delete that fails says why as a notice and leaves every row where it was.
 */
export function HistoryDeleteDialog({ deleting, onClose, workspaceId }: HistoryDeleteDialogProps) {
    const labels = useMessages('history');
    const notifyFailure = useFailureToast();
    const selected = useStore(
        historyStore,
        (state) => selectHistoryFor(workspaceId)(state).selected,
    );
    const all = deleting === 'all';

    function confirm(): void {
        const removal = removalOf(deleting ?? 'selected', selected);

        onClose();

        if (removal === null) {
            return;
        }

        fireAndForget(
            removeHistory(workspaceId, removal).then((code) => {
                if (code !== null) {
                    notifyFailure(code);
                }
            }),
        );
    }

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={labels('deleteCancel')}
            confirmLabel={all ? labels('clearConfirm') : labels('deleteConfirm')}
            description={all ? labels('clearBody') : labels('deleteBody')}
            onCancel={onClose}
            onConfirm={confirm}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            open={deleting !== null}
            title={all ? labels('clearTitle') : labels('deleteTitle')}
        />
    );
}
