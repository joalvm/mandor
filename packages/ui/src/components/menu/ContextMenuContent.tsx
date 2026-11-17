import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

type ContextMenuContentProps = PropsWithChildren;

/** The surface that carries the lines opened at the pointer, sized to its text. */
export function ContextMenuContent({ children }: ContextMenuContentProps) {
    return (
        <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content
                className="z-dropdown rounded-lg border border-border-strong bg-surface-raised p-1 text-text-primary shadow-popover"
                data-part="context-menu-content"
            >
                {children}
            </ContextMenuPrimitive.Content>
        </ContextMenuPrimitive.Portal>
    );
}
