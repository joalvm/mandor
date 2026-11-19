import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
    'aria-label'?: string;
    'aria-labelledby'?: string;
}>;

/**
 * The surface the work is drawn on. The window is a frame, and what the user writes or receives
 * rests on a card above it: rounded, a step apart from the frame by its tone alone, with no line
 * and no shadow around it. The gutter of the frame is what keeps two cards apart, so a card never
 * pads itself away from its neighbours and never holds another card.
 *
 * It takes the name its caller gives it, when the caller has one to give: a card that is a zone
 * of its own (the console) is named, one that is only the body of a tab is not.
 */
export function Card({
    children,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
}: CardProps) {
    return (
        <section
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel bg-surface-card"
            data-part="card"
        >
            {children}
        </section>
    );
}
