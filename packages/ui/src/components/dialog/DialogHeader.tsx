import type { PropsWithChildren } from 'react';

type DialogHeaderProps = PropsWithChildren;

/**
 * The band a dialog is titled in, one for the dialog that holds a form and the one that asks, so
 * the two titles can never stand at different heights. Its insets are worked out in `runtime.css`
 * from the heights of the scale: a title of one line sits on the middle of a band as tall as any
 * header of the window, and the corner the way out stands in is kept clear of it.
 */
export function DialogHeader({ children }: DialogHeaderProps) {
    return (
        <header className="min-w-0" data-part="dialog-header">
            {children}
        </header>
    );
}
