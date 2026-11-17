import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

/**
 * What a `HoverCard` opens: the chrome of a popover, a little narrower, kept inside the window.
 * The pointer may cross into it and read it; leaving it closes it like leaving the control.
 */
export function HoverCardPanel({ children }: PropsWithChildren) {
    return (
        <HoverCardPrimitive.Portal>
            <HoverCardPrimitive.Content
                align="start"
                className="z-popover w-72 rounded-lg border border-border-strong bg-surface-raised p-3 text-sm text-text-primary shadow-popover"
                collisionPadding={8}
                data-part="hover-card-panel"
                sideOffset={4}
            >
                {children}
            </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Portal>
    );
}
