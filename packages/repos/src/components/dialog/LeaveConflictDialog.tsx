import { useMessages } from '@mandor/i18n';
import { ConfirmDialog } from '@mandor/ui';
import { useStore } from 'zustand';

import { conflictDrafts } from '../../lib/conflict-drafts.js';

type LeaveConflictDialogProps = {
    tabId: string;
};

/**
 * Asks before a tab with answers on it goes away: what was picked lives only in the tab, so it
 * is lost, while the clash itself keeps waiting. It opens when something asked the draft
 * whether the tab may leave, and its two answers are the only things that settle it.
 */
export function LeaveConflictDialog({ tabId }: LeaveConflictDialogProps) {
    const messages = useMessages('conflicts');
    const asking = useStore(conflictDrafts, (state) => tabId in state.closing);
    const answer = (leave: boolean): void => {
        conflictDrafts.getState().answerLeave(tabId, leave);
    };

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={messages('closeCancel')}
            confirmLabel={messages('closeConfirm')}
            description={messages('closeBody')}
            onCancel={() => {
                answer(false);
            }}
            onConfirm={() => {
                answer(true);
            }}
            onOpenChange={(open) => {
                if (!open) {
                    answer(false);
                }
            }}
            open={asking}
            title={messages('closeTitle')}
        />
    );
}
