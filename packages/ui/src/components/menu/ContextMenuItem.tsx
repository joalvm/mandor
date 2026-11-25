import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

import { ignoredWhileClosing } from './closing-layer.js';

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
            className="flex h-control cursor-pointer items-center outline-none gap-gap-icon-text rounded-md px-2 text-sm data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-selected"
            data-part="context-menu-item"
            disabled={disabled === true}
            onPointerLeave={ignoredWhileClosing}
            onPointerMove={ignoredWhileClosing}
            onSelect={onSelect}
            title={disabled === true ? disabledReason : undefined}
        >
            {children}
        </ContextMenuPrimitive.Item>
    );
}
