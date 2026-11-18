import { Icon, type IconName } from '@mandor/icons';
import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { activateRow } from '../row/row-activation.js';
import { RowLabel } from '../row/RowLabel.js';

type DialogNavItemProps = PropsWithChildren<{
    icon: IconName;
    label: string;
    onSelect: () => void;
    selected: boolean;
}>;

/**
 * One section in the column of a dialog. It is cut like a tab of the window — rounded, no border,
 * no bar — because that is what it is, standing on its side: what it shows is its state, the one
 * under the pointer and the one open, each with a fill of the column's own.
 *
 * It is the one stop of the tab order when it is open and none when it is not; the arrows that
 * walk the rest belong to the `DialogNavList` it stands in.
 *
 * The glyph is not optional. A column where some sections carry one and others do not starts its
 * names in two different columns. What nests inside travels after the name: a row action of the
 * caller, drawn by whoever owns it, appearing as the group is pointed at or focused.
 */
export function DialogNavItem({ children, icon, label, onSelect, selected }: DialogNavItemProps) {
    return (
        <div
            aria-label={label}
            aria-selected={selected}
            className={cn(
                'group flex h-row min-w-0 shrink-0 cursor-pointer items-center gap-gap-icon-text rounded-md px-pad-control',
                'text-sm transition-colors duration-fast ease-out hover:veil',
                selected
                    ? 'bg-surface-dialog-nav-active text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
            )}
            data-focus-ring=""
            data-part="dialog-nav-item"
            onClick={onSelect}
            onKeyDown={(event) => {
                activateRow(event, onSelect);
            }}
            role="option"
            tabIndex={selected ? 0 : -1}
        >
            <Icon name={icon} />
            <RowLabel>{label}</RowLabel>
            {children}
        </div>
    );
}
