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
 * It is chrome, so it sits on the frame and not in a card. The seam with the workbench is the
 * gutter before the first card; the handle that drags this edge stands in it.
 */
export function SidePanel({ children, width }: SidePanelProps) {
    return (
        <aside
            className="min-h-0 min-w-0 shrink-0 overflow-hidden bg-surface-frame"
            data-part="sidebar"
            data-width={`${String(width)}px`}
        >
            {children}
        </aside>
    );
}
