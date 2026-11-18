import { DropdownMenu } from 'radix-ui';
import { useRef, useState, type PropsWithChildren } from 'react';

import { MenuContext } from './menu-context.js';

type MenuProps = PropsWithChildren<{
    /** Whether its lines may carry a check. Without it, a line that asks for one draws plain. */
    checkable?: boolean | undefined;
}>;

/**
 * A bounded list of commands, written as the tree it is: a trigger, and a content that carries
 * the lines. The menu draws text and nothing else; the line that carries a choice wears it as
 * weight, and only when `checkable` lets a line ask for the mark. Any other mark — an icon at
 * the edge of a line, the keys that run it — is written by the caller inside the line, as a
 * sibling of the text.
 *
 * The line chosen runs as the menu closes, never while it is still open. An open menu holds the
 * focus inside it, so a field that a line opens —the name of a row to rename— would lose the
 * focus the moment it took it, and a field that loses the focus commits what it holds.
 */
export function Menu({ checkable = false, children }: MenuProps) {
    const [open, setOpen] = useState(false);
    const chosen = useRef<(() => void) | null>(null);

    return (
        <DropdownMenu.Root
            onOpenChange={(next) => {
                const command = chosen.current;

                chosen.current = null;
                setOpen(next);

                if (command !== null) {
                    command();
                }
            }}
            open={open}
        >
            <MenuContext.Provider
                value={{
                    checkable,
                    choose: (command) => {
                        chosen.current = command;
                    },
                }}
            >
                {children}
            </MenuContext.Provider>
        </DropdownMenu.Root>
    );
}
