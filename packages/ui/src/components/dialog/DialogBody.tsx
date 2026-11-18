import type { PropsWithChildren } from 'react';

type DialogBodyProps = PropsWithChildren;

/**
 * What the dialog is asking about, under its title and over whatever closes it. It is the one
 * part of the dialog that scrolls: the title and the actions stay where the eye left them.
 */
export function DialogBody({ children }: DialogBodyProps) {
    return (
        <div
            className="flex min-h-0 min-w-0 flex-col gap-gap-group overflow-y-auto px-pad-dialog pb-pad-dialog text-sm"
            data-part="dialog-body"
        >
            {children}
        </div>
    );
}
