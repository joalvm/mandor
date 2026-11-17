import type { Origin } from '@mandor/schema';

import { OriginConfirmDialog } from './OriginConfirmDialog.js';

type RemoveOriginDialogProps = {
    origin: Origin | null;
    onCancel: () => void;
    onConfirm: (origin: Origin) => void;
};

/**
 * Taking an origin off the list takes its copy off this machine, so the dialog asks for the
 * name typed by hand, like everything that cannot be undone. Emptying keeps the origin; this
 * does not.
 */
export function RemoveOriginDialog({ origin, onCancel, onConfirm }: RemoveOriginDialogProps) {
    return (
        <OriginConfirmDialog
            action="remove"
            onCancel={onCancel}
            onConfirm={onConfirm}
            origin={origin}
        />
    );
}
