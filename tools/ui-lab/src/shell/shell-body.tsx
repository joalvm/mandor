import type { PropsWithChildren } from 'react';

/**
 * The body row: navigation on one side, the scrolling content track on the other. The lanes
 * are sized here — the sidebar keeps its own width, the content track takes the rest — so a
 * wide page can never push the frame wider than the window.
 */
export function ShellBody({ children }: PropsWithChildren) {
    return (
        <div
            className="grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden pr-gap-gutter pb-gap-gutter"
            data-part="shell-body"
        >
            {children}
        </div>
    );
}
