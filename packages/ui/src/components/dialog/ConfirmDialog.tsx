import { AlertDialog } from 'radix-ui';
import { useState } from 'react';

import { Button } from '../button/Button.js';
import { Input } from '../input/Input.js';
import { AlertFrame } from './AlertFrame.js';
import { DialogBody } from './DialogBody.js';
import { DialogFooter } from './DialogFooter.js';

type ConfirmDialogProps = {
    cancelLabel: string;
    confirmLabel: string;
    /**
     * The word the user has to type to unlock the confirm button. What cannot be undone asks
     * for the name of what it destroys, not for a click.
     */
    confirmationName?: string | undefined;
    description: string;
    onCancel: () => void;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    title: string;
};

/**
 * Names an irreversible action and starts focus on its safe alternative, which the alert dialog
 * underneath guarantees. It is cut from the same frame as every other dialog; what sets it apart
 * is that nothing outside it dismisses it and it has no corner to leave by — the two answers are
 * the only ways out.
 *
 * The two answers keep the size of every other button: the stop comes from the colour, not from
 * the size. The verb is red, the one red of the window that speaks of what is about to happen, so
 * it reads as a warning before it reads as a way forward; the way back stays quiet, and holds the
 * focus.
 *
 * The name asked for is forgotten the moment the dialog leaves, however it left: it is held by
 * what the frame draws, which leaves with it, so a confirmation that comes back asks again and
 * never wakes up with the answer of the one before half written.
 */
export function ConfirmDialog({ onOpenChange, open, title, ...answers }: ConfirmDialogProps) {
    return (
        <AlertFrame onOpenChange={onOpenChange} open={open} title={title}>
            <ConfirmAnswers {...answers} />
        </AlertFrame>
    );
}

type ConfirmAnswersProps = Omit<ConfirmDialogProps, 'onOpenChange' | 'open' | 'title'>;

/** What the frame holds while it is open: the name typed lives here and leaves with it. */
function ConfirmAnswers({
    cancelLabel,
    confirmLabel,
    confirmationName,
    description,
    onCancel,
    onConfirm,
}: ConfirmAnswersProps) {
    const [typed, setTyped] = useState('');
    const confirmed = confirmationName === undefined || typed === confirmationName;

    return (
        <>
            <DialogBody>
                <AlertDialog.Description className="leading-5 text-text-secondary">
                    {description}
                </AlertDialog.Description>
                <ConfirmationName name={confirmationName} onValueChange={setTyped} value={typed} />
            </DialogBody>
            <DialogFooter>
                <AlertDialog.Cancel asChild>
                    <Button onClick={onCancel} variant="secondary">
                        {cancelLabel}
                    </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                    <Button
                        disabled={!confirmed}
                        onClick={() => {
                            setTyped('');
                            onConfirm();
                        }}
                        variant="danger"
                    >
                        {confirmLabel}
                    </Button>
                </AlertDialog.Action>
            </DialogFooter>
        </>
    );
}

type ConfirmationNameProps = {
    name: ConfirmDialogProps['confirmationName'];
    onValueChange: (value: string) => void;
    value: string;
};

function ConfirmationName({ name, onValueChange, value }: ConfirmationNameProps) {
    if (name === undefined) {
        return null;
    }

    return <Input label={name} onValueChange={onValueChange} value={value} variant="text" />;
}
