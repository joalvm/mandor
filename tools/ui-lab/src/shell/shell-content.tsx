import type { PropsWithChildren } from 'react';

/**
 * The scrolling content track. Width overflow belongs to the pieces inside; the track itself
 * stays inside its lane and scrolls only vertically.
 */
export function ShellContent({ children }: PropsWithChildren) {
    return (
        <main className="min-w-0 overflow-y-auto bg-surface-app" data-part="shell-content">
            {children}
        </main>
    );
}
