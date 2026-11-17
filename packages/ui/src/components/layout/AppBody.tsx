import type { PropsWithChildren } from 'react';

type AppBodyProps = PropsWithChildren;

/**
 * The band between the title row and the status row, laid out along the horizontal.
 *
 * It measures nothing of its own: each child declares the width it keeps, and what is left over
 * goes to the one that asked to grow. Across the band every one of them takes the whole height,
 * lateral and centre alike, so `items-stretch` is the alignment and it is said out loud.
 *
 * The chain of `min-*` is what lets a long name inside a panel truncate instead of pushing the
 * window into a horizontal scroll.
 */
export function AppBody({ children }: AppBodyProps) {
    return (
        <div
            className="flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden"
            data-part="app-body"
        >
            {children}
        </div>
    );
}
