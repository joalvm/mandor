import type { PropsWithChildren } from 'react';

type AppShellProps = PropsWithChildren;

/**
 * The window itself: one column, from the title row down to the status row.
 *
 * It knows how tall it is and that nothing may scroll out of it. What the rows are and in which
 * order they come is the tree an app writes, not a shape this box imposes — the two apps share
 * a look today and are free to stop sharing it without asking anything of this file.
 */
export function AppShell({ children }: AppShellProps) {
    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-surface-app"
            data-part="app-shell"
        >
            {children}
        </div>
    );
}
