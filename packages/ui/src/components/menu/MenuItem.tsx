import { DropdownMenu } from 'radix-ui';
import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { ignoredWhileClosing } from './closing-layer.js';
import { useMenuContext } from './menu-context.js';

type MenuItemProps = PropsWithChildren<{
    /** The mark of the chosen line, inside a menu that said it takes marks. */
    checked?: boolean | undefined;
    disabled?: boolean | undefined;
    /** Why the line cannot run, shown while it is disabled. */
    disabledReason?: string | undefined;
    onSelect: () => void;
}>;

/**
 * One line of a menu: text by default, and whatever the caller writes beside the text. The
 * chosen line is told by weight, not by a glyph: it keeps its place, its neighbours keep theirs,
 * and no column stands reserved for a mark that most lines never carry.
 */
export function MenuItem({
    checked = false,
    children,
    disabled,
    disabledReason,
    onSelect,
}: MenuItemProps) {
    const { checkable, choose } = useMenuContext();

    return (
        <DropdownMenu.Item
            className={cn(
                'flex h-control cursor-pointer items-center outline-none gap-gap-icon-text rounded-md px-2 text-sm data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-selected',
                checkable && checked && 'font-semibold',
            )}
            data-part="menu-item"
            disabled={disabled === true}
            onPointerLeave={ignoredWhileClosing}
            onPointerMove={ignoredWhileClosing}
            onSelect={() => {
                choose(onSelect);
            }}
            title={disabled === true ? disabledReason : undefined}
        >
            {children}
        </DropdownMenu.Item>
    );
}
