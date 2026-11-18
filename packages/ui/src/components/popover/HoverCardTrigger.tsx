import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { type FocusEvent, type ReactElement, useRef } from 'react';

type HoverCardTriggerProps = { children: ReactElement };

/**
 * A click focuses the control too, and that focus would open the card and hold it open until the
 * focus went somewhere else. Only a focus the pointer did not bring opens it; the pointer opens it
 * by resting.
 */
export function HoverCardTrigger({ children }: HoverCardTriggerProps) {
    const pressed = useRef(false);

    return (
        <HoverCardPrimitive.Trigger
            asChild
            onFocus={(event: FocusEvent<HTMLElement>) => {
                if (pressed.current) {
                    event.preventDefault();
                }

                pressed.current = false;
            }}
            onPointerDown={() => {
                pressed.current = true;
            }}
        >
            {children}
        </HoverCardPrimitive.Trigger>
    );
}
