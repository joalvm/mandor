import { Icon, type IconName } from '@mandor/icons';

import { cn } from '../../lib/cn.js';

type EmptyRowProps = {
    description: string;
    icon: IconName;
    /** How deep the message sits under the title of its section, like any row of the tree. */
    level?: number | undefined;
    title: string;
};

/**
 * An empty section of the lateral, said in up to two lines and at the depth of the rows that are
 * missing: cut at one, what it says is lost at the size the lateral opens with. It carries no way
 * out: the lateral is narrow, the section header already holds the button that fills it, and a
 * second one here would be the same action twice.
 */
export function EmptyRow({ description, icon, level, title }: EmptyRowProps) {
    return (
        <p
            className={cn(
                'flex min-h-0 min-w-0 items-start gap-gap-tight pe-pad-panel py-pad-control text-xs text-text-secondary',
                level === undefined && 'ps-pad-panel',
            )}
            data-level={level === undefined ? undefined : String(level)}
            data-part="empty-row"
            role="status"
        >
            <span aria-hidden="true">
                <Icon name={icon} size="sm" />
            </span>
            <span className="line-clamp-2">
                <span className="text-text-primary">{title}</span>
                <span> · {description}</span>
            </span>
        </p>
    );
}
