import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import type { ReactElement } from 'react';

type ContextMenuTriggerProps = { children: ReactElement };

/** Turns the surface written inside it into the one that opens the menu at the pointer. */
export function ContextMenuTrigger({ children }: ContextMenuTriggerProps) {
    return <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>;
}
