import { AlertDialog } from 'radix-ui';
import { useRef, type PropsWithChildren } from 'react';

import { DIALOG_SCRIM, DIALOG_SURFACE, DIALOG_TITLE } from './dialog-frame.js';
import { DialogHeader } from './DialogHeader.js';

type AlertFrameProps = PropsWithChildren<{
    onOpenChange: (open: boolean) => void;
    open: boolean;
    title: string;
}>;

/**
 * The frame of a dialog that asks: the scrim, the surface and the title, written once for every
 * alert of the window. Nothing outside dismisses it and it has no corner to leave by. The
 * children are the body, with what the question is about, and the footer with the answers: the
 * only ways out. No trigger opens it, so the frame remembers what had the focus when it
 * opened and gives the focus back there when it leaves.
 */
export function AlertFrame({ children, onOpenChange, open, title }: AlertFrameProps) {
    const opener = useRef<HTMLElement | null>(null);

    return (
        <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className={DIALOG_SCRIM} data-part="dialog-scrim">
                    <AlertDialog.Content
                        className={DIALOG_SURFACE}
                        data-part="dialog"
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            opener.current?.focus();
                        }}
                        onOpenAutoFocus={() => {
                            const focused = document.activeElement;

                            opener.current = focused instanceof HTMLElement ? focused : null;
                        }}
                    >
                        <DialogHeader>
                            <AlertDialog.Title className={DIALOG_TITLE}>{title}</AlertDialog.Title>
                        </DialogHeader>
                        {children}
                    </AlertDialog.Content>
                </AlertDialog.Overlay>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
