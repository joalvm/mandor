import { DropdownMenu } from 'radix-ui';
import type { ReactElement } from 'react';

type MenuTriggerProps = { children: ReactElement };

/**
 * Turns whatever is written inside it into the control that opens the menu around it.
 *
 * It draws nothing of its own: it hands the open, the keyboard and the accessible wiring to the
 * one control it wraps, which is what keeps the library that provides all of that from leaking
 * past `@mandor/ui`.
 */
export function MenuTrigger({ children }: MenuTriggerProps) {
    return <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>;
}
