import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

/** How long the pointer rests before the card opens: passing over a figure opens nothing. */
const OPEN_DELAY_MS = 400;

/** How long the card waits after the pointer left, so a pointer on its way into it keeps it. */
const CLOSE_DELAY_MS = 150;

/**
 * A detail read in passing: it opens when the pointer rests on its control or the keyboard
 * lands on it, and closes when either leaves. Nothing in it is used, so it never takes the
 * focus, and a click on the control neither opens nor pins it.
 *
 * The control and the card are both written inside, as siblings, like a `Popover`.
 */
export function HoverCard({ children }: PropsWithChildren) {
    return (
        <HoverCardPrimitive.Root closeDelay={CLOSE_DELAY_MS} openDelay={OPEN_DELAY_MS}>
            {children}
        </HoverCardPrimitive.Root>
    );
}
