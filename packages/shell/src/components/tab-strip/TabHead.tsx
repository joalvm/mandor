import { cn, Tooltip } from '@mandor/ui';

type TabHeadProps = {
    missing: boolean;
    title: string;
    trail: string;
};

/**
 * What a pill says: its title. The name is edited where the thing is listed, in the lateral; the
 * pill only reads it back.
 *
 * A long title is cut, so pointing at it says it whole, with the names of what holds it: two tabs
 * of the same name in different folders are told apart there. The tooltip of the window, never a
 * native title, which would be a second globe, late and of another shape.
 */
export function TabHead({ missing, title, trail }: TabHeadProps) {
    return (
        <Tooltip content={trail === '' ? title : `${title} — ${trail}`}>
            <span
                className={cn('min-w-0', missing && 'line-through')}
                data-fade-overflow=""
                data-part="tab-head"
            >
                {title}
            </span>
        </Tooltip>
    );
}
