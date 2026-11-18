import { AlertDialog } from 'radix-ui';

import { Button } from '../button/Button.js';
import { AlertFrame } from './AlertFrame.js';
import { DialogBody } from './DialogBody.js';
import { DialogFooter } from './DialogFooter.js';

type SaveChangesDialogProps = {
    cancelLabel: string;
    description: string;
    discardLabel: string;
    onCancel: () => void;
    onDiscard: () => void;
    /** Without it, the work has nowhere to be saved: only letting it go or staying are offered. */
    onSave?: (() => void) | undefined;
    open: boolean;
    saveLabel: string;
    /** The save is under way: no answer can be given twice, nor another one on top of it. */
    saving?: boolean | undefined;
    title: string;
};

/**
 * Asks what to do with work that is not on disk before what holds it goes away: save it, let it
 * go, or stay. Cut from the frame of every dialog, with no corner to leave by: the three answers,
 * or Escape for staying, are the only ways out.
 *
 * Saving is the primary, the way forward that loses nothing. Letting go keeps the quiet shape of
 * the way back, beside it: it is not the destruction of something that was there, only the end of
 * an edit, and the red of the window stays for what cannot be had again. The focus starts on
 * staying, so a key pressed by habit neither writes nor throws anything away.
 */
export function SaveChangesDialog({
    cancelLabel,
    description,
    discardLabel,
    onCancel,
    onDiscard,
    onSave,
    open,
    saveLabel,
    saving = false,
    title,
}: SaveChangesDialogProps) {
    return (
        <AlertFrame
            onOpenChange={(next) => {
                if (!next && !saving) {
                    onCancel();
                }
            }}
            open={open}
            title={title}
        >
            <DialogBody>
                <AlertDialog.Description className="leading-5 text-text-secondary">
                    {description}
                </AlertDialog.Description>
            </DialogBody>
            <DialogFooter>
                <Button disabled={saving} onClick={onDiscard} variant="secondary">
                    {discardLabel}
                </Button>
                <AlertDialog.Cancel asChild>
                    <Button disabled={saving} onClick={onCancel} variant="secondary">
                        {cancelLabel}
                    </Button>
                </AlertDialog.Cancel>
                <SaveAnswer label={saveLabel} onSave={onSave} saving={saving} />
            </DialogFooter>
        </AlertFrame>
    );
}

type SaveAnswerProps = {
    label: string;
    onSave: SaveChangesDialogProps['onSave'];
    saving: boolean;
};

function SaveAnswer({ label, onSave, saving }: SaveAnswerProps) {
    if (onSave === undefined) {
        return null;
    }

    return (
        <Button disabled={saving} onClick={onSave} variant="primary">
            {label}
        </Button>
    );
}
