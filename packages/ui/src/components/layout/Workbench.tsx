import type { PropsWithChildren } from 'react';

type WorkbenchProps = PropsWithChildren;

/**
 * The centre of the window, and the one zone that takes whatever room is left.
 *
 * It is a single box on purpose. What fills it — one group of tabs, four of them, a single
 * document — is the decision of whoever writes it in, and a zone that named a composer and a
 * result panel would have forbidden every other arrangement. It has no surface of its own: it
 * shows the frame, and the cards inside it carry theirs.
 */
export function Workbench({ children }: WorkbenchProps) {
    return (
        <main
            className="flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden bg-surface-frame"
            data-part="workbench"
        >
            {children}
        </main>
    );
}
