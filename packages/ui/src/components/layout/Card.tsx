import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

/** How much of its column a card takes: all that is left, or only what its contents measure. */
type CardSize = 'fill' | 'content';

const SIZES: Record<CardSize, string> = {
    fill: 'h-full flex-1',
    content: 'shrink-0',
};

type CardProps = PropsWithChildren<{
    'aria-label'?: string;
    'aria-labelledby'?: string;
    size?: CardSize;
}>;

/**
 * The surface the work is drawn on. The window is a frame, and what the user writes or receives
 * rests on a card above it: rounded, a step apart from the frame by its tone alone, with no line
 * and no shadow around it. The gutter of the frame is what keeps two cards apart, so a card never
 * pads itself away from its neighbours and never holds another card.
 *
 * It takes the name its caller gives it, when the caller has one to give: a card that is a zone
 * of its own (the console) is named, one that is only the body of a tab is not.
 *
 * It fills what is left of its column unless it is told to measure its contents: the card that
 * holds the destination of a request sits above the pair that share the rest.
 */
export function Card({
    children,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    size = 'fill',
}: CardProps) {
    return (
        <section
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn(
                'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-panel bg-surface-card',
                SIZES[size],
            )}
            data-part="card"
            data-size={size}
        >
            {children}
        </section>
    );
}
