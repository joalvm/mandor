import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

type CollapsibleProps = PropsWithChildren<{
    onOpenChange: (open: boolean) => void;
    open: boolean;
}>;

/**
 * One named region that folds into its header. The header stays put when folded, because a
 * section the user cannot see is a section they cannot bring back. Folding is consumer-owned:
 * the sidebar writes it to the session, and this only reports the change.
 *
 * Open, it takes what is left of the column; folded, it takes only its header. Which is why the
 * open state is here and not read off a `data-` attribute: it decides a size, not a look.
 */
export function Collapsible({ children, onOpenChange, open }: CollapsibleProps) {
    return (
        <CollapsiblePrimitive.Root
            className={cn('flex min-h-0 flex-col', open ? 'flex-1' : 'shrink-0')}
            data-part="collapsible"
            onOpenChange={onOpenChange}
            open={open}
        >
            {children}
        </CollapsiblePrimitive.Root>
    );
}
