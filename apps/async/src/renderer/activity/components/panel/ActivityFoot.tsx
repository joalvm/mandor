import { useMessages } from '@mandor/i18n';
import { Button } from '@mandor/ui';

type ActivityFootProps = {
    /** What the narrowing of the head hides: the count the band owes saying out loud. */
    hidden: number;
    /** Lifting the filter is putting the head back at rest: a view never touched the buffer. */
    onShowAll: () => void;
};

/**
 * The foot of the timeline, there only while a filter hides something: what it hides and the way
 * back. A short list that never said it was filtered reads as a message that never arrived, so
 * the count is said, never implied. What the connection moved is said in the head.
 */
export function ActivityFoot({ hidden, onShowAll }: ActivityFootProps) {
    const messages = useMessages('connections');

    if (hidden <= 0) {
        return null;
    }

    return (
        <p
            className="flex h-section shrink-0 items-center gap-gap-tight px-pad-panel text-xs text-text-warning tabular-nums"
            data-part="activity-foot"
        >
            <span>{messages('filterHidden', { count: hidden })}</span>
            <Button onClick={onShowAll} size="sm" variant="ghost">
                {messages('filterShowAll')}
            </Button>
        </p>
    );
}
