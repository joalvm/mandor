import type { PropsWithChildren } from 'react';

type SidePanelProps = PropsWithChildren<{
    /** Pixels, kept as the user dragged it. A share of the window would widen a list of names. */
    width: number;
}>;

/**
 * The lateral zone of the window, at the width it was dragged to.
 *
 * The width travels as an attribute and the stylesheet resolves it: a value in the JSX would be
 * geometry written twice, once where the box is declared and once where it is drawn.
 *
 * The seam with the workbench is not drawn here. The handle that drags this edge stands on it
 * and is the line: a border of the zone plus a track beside it were two lines where the window
 * has one, and that pair is what read as a division instead of a seam.
 */
export function SidePanel({ children, width }: SidePanelProps) {
    return (
        <aside
            className="min-h-0 min-w-0 shrink-0 overflow-hidden bg-surface-panel"
            data-part="sidebar"
            data-width={`${String(width)}px`}
        >
            {children}
        </aside>
    );
}
