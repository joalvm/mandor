import { useMessages } from '@mandor/i18n';
import type { Origin } from '@mandor/schema';
import { ConfirmDialog } from '@mandor/ui';

type OriginConfirmDialogProps = {
    action: 'empty' | 'remove';
    origin: Origin | null;
    onCancel: () => void;
    onConfirm: (origin: Origin) => void;
};

/**
 * The question both irreversible things done to an origin ask the same way: the name typed by
 * hand, like everything that cannot be undone. The action picks the words; open while an
 * origin is named, closed when none is.
 */
export function OriginConfirmDialog({
    action,
    origin,
    onCancel,
    onConfirm,
}: OriginConfirmDialogProps) {
    const messages = useMessages('origins');

    return (
        // modal-policy: irreversible-confirmation
        <ConfirmDialog
            cancelLabel={messages('cancel')}
            confirmLabel={
                origin === null ? '' : messages(`${action}Confirm`, { name: origin.name })
            }
            confirmationName={origin?.name}
            description={origin === null ? '' : messages(`${action}Body`, { name: origin.name })}
            onCancel={onCancel}
            onConfirm={() => {
                if (origin !== null) {
                    onConfirm(origin);
                }
            }}
            onOpenChange={(open) => {
                if (!open) {
                    onCancel();
                }
            }}
            open={origin !== null}
            title={origin === null ? '' : messages(`${action}Title`, { name: origin.name })}
        />
    );
}
