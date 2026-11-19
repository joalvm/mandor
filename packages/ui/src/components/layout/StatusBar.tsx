import type { PropsWithChildren } from 'react';

type StatusBarProps = PropsWithChildren;

/**
 * The bottom zone of the window, at the height of the scale.
 *
 * It sits on the frame and draws no line above it: the cards of the work end a gutter above
 * it, and that edge is the seam.
 */
export function StatusBar({ children }: StatusBarProps) {
    return (
        <footer className="h-statusbar shrink-0 bg-surface-frame" data-part="status-bar">
            {children}
        </footer>
    );
}
