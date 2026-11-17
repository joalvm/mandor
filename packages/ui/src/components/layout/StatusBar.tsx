import type { PropsWithChildren } from 'react';

type StatusBarProps = PropsWithChildren;

/**
 * The bottom zone of the window, at the height of the scale.
 *
 * It draws no line above it: the surface it sits on is a step apart from the body, and the seam
 * between two surfaces is already visible.
 */
export function StatusBar({ children }: StatusBarProps) {
    return (
        <footer className="h-statusbar shrink-0 bg-surface-panel" data-part="status-bar">
            {children}
        </footer>
    );
}
