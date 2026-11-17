import type { Origin } from '@mandor/schema';

import { OriginConfirmDialog } from './OriginConfirmDialog.js';

type EmptyOriginDialogProps = {
    origin: Origin | null;
    onCancel: () => void;
    onConfirm: (origin: Origin) => void;
};

/**
 * Emptying an origin cannot be undone, so the dialog asks for the name typed by hand, like
 * everything that cannot be undone.
 */
export function EmptyOriginDialog({ origin, onCancel, onConfirm }: EmptyOriginDialogProps) {
    return (
        <OriginConfirmDialog
            action="empty"
            onCancel={onCancel}
            onConfirm={onConfirm}
            origin={origin}
        />
    );
}
