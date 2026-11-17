import { DropdownMenu } from 'radix-ui';

/** The rule that parts two groups of commands, drawn the same in every menu. */
export function MenuSeparator() {
    return (
        <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" data-part="menu-separator" />
    );
}
