import type { PropsWithChildren } from 'react';

import { walkOptions } from '../row/walk-options.js';

type DialogNavListProps = PropsWithChildren<{
    label: string;
}>;

/**
 * The list of sections in the column of a dialog, named for whoever cannot see the column. It
 * owns the keyboard of the list the way a list does: the tab key stops once, on the section
 * open, and the arrows, Home and End walk the rest without opening any of them.
 *
 * It is the one part of the column that scrolls, so whatever the column holds under it —the way
 * to add one more— stays where the eye left it.
 */
export function DialogNavList({ children, label }: DialogNavListProps) {
    return (
        <div
            aria-label={label}
            className="flex min-h-0 flex-1 flex-col gap-gap-tight overflow-y-auto"
            data-part="dialog-nav-list"
            onKeyDown={walkOptions}
            role="listbox"
        >
            {children}
        </div>
    );
}
