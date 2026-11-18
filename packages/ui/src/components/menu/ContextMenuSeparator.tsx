import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';

/** The rule that parts two groups of commands, drawn the same in every menu. */
export function ContextMenuSeparator() {
    return (
        <ContextMenuPrimitive.Separator
            className="my-1 h-px bg-border-subtle"
            data-part="context-menu-separator"
        />
    );
}
