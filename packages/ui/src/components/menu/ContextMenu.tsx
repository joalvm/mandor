import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

/**
 * The commands of a surface, at the pointer. The same parts as `Menu`, but there is no button to
 * hang from: the child of the trigger is the surface itself. The menu is sized to its text — the
 * minimum is the width of the shortest command word — and draws no columns, so its lines are
 * text only.
 */
export function ContextMenu({ children }: PropsWithChildren) {
    return <ContextMenuPrimitive.Root>{children}</ContextMenuPrimitive.Root>;
}
