import type { PropsWithChildren } from 'react';

type DialogFooterProps = PropsWithChildren;

/**
 * Where a dialog ends: its actions, against the closing edge, in a band as tall as the title's.
 * No line separates it from the body — the air above the buttons already does — and the step of
 * air under the band is its own, so the buttons keep their distance from the bottom edge with no
 * margin written on anything around them.
 */
export function DialogFooter({ children }: DialogFooterProps) {
    return (
        <footer
            className="box-content flex h-header shrink-0 items-center justify-end gap-gap-control px-pad-dialog pb-pad-control"
            data-part="dialog-footer"
        >
            {children}
        </footer>
    );
}
