import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ReactElement } from 'react';

type PopoverTriggerProps = { children: ReactElement };

/**
 * Turns whatever is written inside it into the control that opens the panel beside it.
 *
 * It draws nothing of its own; it hands the open and the focus return to the one control it
 * wraps, which is what keeps the library that provides them from leaking past `@mandor/ui`.
 */
export function PopoverTrigger({ children }: PopoverTriggerProps) {
    return <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>;
}
