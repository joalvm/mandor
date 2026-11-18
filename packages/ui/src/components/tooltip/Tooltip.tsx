import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ReactElement } from 'react';

type TooltipProps = {
    children: ReactElement;
    content: string;
};

/**
 * Shows short explanatory text without adding a focusable surface.
 *
 * The text is text and nothing else. A tooltip that accepted a tree would be a second, smaller
 * window with no way in from the keyboard: whatever were put inside it could not be reached,
 * clicked or read out, and the first control someone hid in one would be a control nobody has.
 */
export function Tooltip({ children, content }: TooltipProps) {
    return (
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    className="z-tooltip max-w-70 rounded-md border border-border-strong bg-surface-raised px-2 py-1 text-xs text-text-primary shadow-popover"
                    sideOffset={4}
                >
                    {content}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}
