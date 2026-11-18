import { useId, type PropsWithChildren } from 'react';
import { Icon, type IconName } from '@mandor/icons';

type EmptyStateProps = PropsWithChildren<{
    description: string;
    icon: IconName;
    title: string;
}>;

/**
 * A region with nothing in it, explained: what is missing, why, and the way out written under
 * the explanation.
 *
 * The way out is written inside, and there is not always one: a kind of item this window never
 * registered has nothing to offer, and an empty state that demanded a button would be answered
 * with an empty one.
 *
 * The glyph is not optional. An empty region that says nothing about what belongs in it reads
 * as a region that failed to load, and the glyph is the first thing that tells the two apart.
 */
export function EmptyState({ children, description, icon, title }: EmptyStateProps) {
    const titleId = useId();

    return (
        <div
            aria-labelledby={titleId}
            className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-gap-control p-gap-section text-center"
            data-part="empty-state"
            role="status"
        >
            <span className="text-text-secondary">
                <Icon name={icon} size="lg" />
            </span>
            <h2 className="text-md text-text-primary" id={titleId}>
                {title}
            </h2>
            <div className="max-w-90 text-sm text-text-secondary">{description}</div>
            {children}
        </div>
    );
}
