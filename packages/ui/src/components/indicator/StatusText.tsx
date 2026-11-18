import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

type StatusTextProps = PropsWithChildren<{
    className?: string | undefined;
}>;

/**
 * A few words of a bar that say how the window stands, read aloud by the assistive technology
 * when they change. It lives in a bar the reader never leaves, which is why it is no notice:
 * it asks for nothing, takes no height and leaves nothing to copy. A thing the reader must
 * answer or keep goes by toast or by the activity log.
 */
export function StatusText({ children, className }: StatusTextProps) {
    return (
        <span className={cn(className)} data-part="status-text" role="status">
            {children}
        </span>
    );
}
