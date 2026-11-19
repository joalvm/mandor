import type { PropsWithChildren } from 'react';

type TitleBarProps = PropsWithChildren;

/**
 * The top zone of the window, drawn at the height of the scale and never taller.
 *
 * It is the row too, not a box holding another box: the zone and the row had the same height,
 * the same children and no reason to be two nodes. What sits along it is written by the app, in
 * the order the app writes it; the zone only says how tall it is and that its contents sit
 * centred across it.
 *
 * The row opens with padding on the left and closes flush: the window buttons reach the corner
 * on every platform, and air there is window that refuses to close.
 *
 * The whole zone is a drag surface and the buttons carve themselves out of it, which is the part
 * `runtime.css` decides from `data-part`.
 *
 * It sits on the frame with the lateral and the status row, and draws no line under it: the
 * frame runs on unbroken below it, and what marks where the work begins is the card on top.
 */
export function TitleBar({ children }: TitleBarProps) {
    return (
        <header
            className="flex h-titlebar shrink-0 items-center gap-gap-control bg-surface-frame pl-pad-panel"
            data-part="titlebar"
        >
            {children}
        </header>
    );
}
