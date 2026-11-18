import { useMessages } from '@mandor/i18n';
import { ConfirmDialog } from '@mandor/ui';

type CookieClearDialogProps = {
    onCancel: () => void;
    onConfirm: () => void;
    open: boolean;
};

/** The one question before the jar is emptied: every cookie of the environment goes at once. */
export function CookieClearDialog({ onCancel, onConfirm, open }: CookieClearDialogProps) {
    const labels = useMessages('cookies');

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={labels('clearCancel')}
            confirmLabel={labels('clearConfirm')}
            description={labels('clearBody')}
            onCancel={onCancel}
            onConfirm={onConfirm}
            onOpenChange={(next) => {
                if (!next) {
                    onCancel();
                }
            }}
            open={open}
            title={labels('clearTitle')}
        />
    );
}
