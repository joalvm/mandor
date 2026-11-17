import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

type SplitHalfProps = PropsWithChildren<{
    className?: string | undefined;
}>;

/**
 * One side of a split.
 *
 * It exists so that a half is written where it is drawn and so that neither half can push the
 * other: a region that does not say it may shrink grows to whatever it holds, and the split
 * position stops meaning anything the first time one side is given a long line.
 */
export function SplitHalf({ children, className }: SplitHalfProps) {
    return (
        <div className={cn('min-h-0 min-w-0 overflow-hidden', className)} data-part="split-half">
            {children}
        </div>
    );
}
