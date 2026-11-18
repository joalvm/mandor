import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

type ContextMenuItemProps = PropsWithChildren<{
    disabled?: boolean | undefined;
    /** Why the line cannot run, shown while it is disabled. */
    disabledReason?: string | undefined;
    onSelect: () => void;
}>;

/**
 * One command opened at the pointer, cut like a line of `Menu` so the two menus of the window
 * stand at the same height and in the same type. Text only: the menu is sized to its words and
 * draws no columns, so nothing marks a line and nothing sits ahead of the text.
 */
export function ContextMenuItem({
    children,
    disabled,
    disabledReason,
    onSelect,
}: ContextMenuItemProps) {
    return (
        <ContextMenuPrimitive.Item
            className="flex h-row-xs cursor-pointer items-center gap-gap-icon-text rounded-md px-2 text-xs data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-control-hover"
            data-part="context-menu-item"
            disabled={disabled === true}
            onSelect={onSelect}
            title={disabled === true ? disabledReason : undefined}
        >
            {children}
        </ContextMenuPrimitive.Item>
    );
}
