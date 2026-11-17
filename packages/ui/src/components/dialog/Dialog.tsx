import { Dialog as DialogPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

import { hasEditToRestore } from '../../lib/held-text.js';
import { IconButton } from '../button/IconButton.js';
import { DIALOG_SCRIM, DIALOG_SURFACE, DIALOG_TITLE } from './dialog-frame.js';
import { DialogHeader } from './DialogHeader.js';

type DialogProps = PropsWithChildren<{
    closeLabel: string;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    title: string;
}>;

/**
 * A modal surface with an exact title and a way out of it. What it holds is written by whoever
 * opens it: a `DialogNav` when it has sections, a `DialogBody` with the form, and a
 * `DialogFooter` with what closes it. Its size follows from those parts, never from the caller.
 *
 * The way out stands in the corner and is written last, so it is the last stop of the tab order:
 * the focus starts on what the dialog holds, which is what whoever opened it came for.
 *
 * Escape on a line that can still give back what it held does that first; the next one closes.
 */
export function Dialog({ children, closeLabel, onOpenChange, open, title }: DialogProps) {
    return (
        <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className={DIALOG_SCRIM} data-part="dialog-scrim">
                    <DialogPrimitive.Content
                        aria-describedby={undefined}
                        className={DIALOG_SURFACE}
                        data-part="dialog"
                        onEscapeKeyDown={(event) => {
                            if (hasEditToRestore(document.activeElement)) {
                                event.preventDefault();
                            }
                        }}
                    >
                        <DialogHeader>
                            <DialogPrimitive.Title className={DIALOG_TITLE}>
                                {title}
                            </DialogPrimitive.Title>
                        </DialogHeader>
                        {children}
                        <DialogPrimitive.Close asChild>
                            <IconButton
                                data-part="dialog-close"
                                icon="close"
                                label={closeLabel}
                                size="md"
                            />
                        </DialogPrimitive.Close>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Overlay>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
