import { DropdownMenu } from 'radix-ui';
import type { PropsWithChildren } from 'react';

type MenuContentProps = PropsWithChildren<{
    /**
     * Opens at the start edge of the trigger and no narrower than it: the list of a trigger that
     * names the current choice, so the chosen line sits under the name that said it.
     */
    fitTrigger?: boolean | undefined;
}>;

/**
 * The surface that carries the lines of a `Menu`: one portal, one alignment and one chrome for
 * every menu in the window, so no caller repeats the box the lines sit in.
 *
 * Closing gives the focus back to the trigger, unless the line chosen already gave it to
 * something else —the field it opened— which keeps it: taking it back would commit that field
 * before anyone typed in it.
 */
export function MenuContent({ children, fitTrigger = false }: MenuContentProps) {
    return (
        <DropdownMenu.Portal>
            <DropdownMenu.Content
                align={fitTrigger ? 'start' : 'center'}
                className="z-dropdown rounded-panel border border-border-subtle bg-surface-raised p-1 text-text-primary shadow-popover"
                data-fit-trigger={fitTrigger ? '' : undefined}
                data-part="menu-content"
                onCloseAutoFocus={(event) => {
                    const held = document.activeElement;

                    // Something took the focus when the menu let it go, rather than nothing holding it.
                    if (held !== null && held !== document.body) {
                        event.preventDefault();
                    }
                }}
                sideOffset={4}
            >
                {children}
            </DropdownMenu.Content>
        </DropdownMenu.Portal>
    );
}
