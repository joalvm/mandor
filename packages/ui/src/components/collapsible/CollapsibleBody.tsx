import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

type CollapsibleBodyProps = PropsWithChildren;

/**
 * What the region holds, scrolling on its own so folding a neighbour never moves it.
 *
 * It lays its content out as a column, so what fills the region —a tree that scrolls and draws
 * only the lines on screen— can take exactly the height left and be the one box that scrolls.
 * A list that only grows keeps its height and this box scrolls it instead.
 */
export function CollapsibleBody({ children }: CollapsibleBodyProps) {
    return (
        <CollapsiblePrimitive.Content
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            data-part="collapsible-body"
        >
            {children}
        </CollapsiblePrimitive.Content>
    );
}
