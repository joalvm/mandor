import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

/**
 * What the pointer has to rest on a thing before its tooltip opens. Long on purpose: a tooltip
 * is asked for by stopping, and a pointer that only crosses the window on its way somewhere else
 * must not leave a trail of globes over what the reader is looking at.
 */
const OPEN_DELAY_MS = 1500;

type TooltipProviderProps = PropsWithChildren<{
    delayDuration?: number | undefined;
}>;

/**
 * Owns the shared delay state for every tooltip in an Mandor window. The library keeps its short
 * grace: once a tooltip has shown, the next one under the pointer shows at once.
 */
export function TooltipProvider({ children, delayDuration = OPEN_DELAY_MS }: TooltipProviderProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={delayDuration}>
            {children}
        </TooltipPrimitive.Provider>
    );
}
