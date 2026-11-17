import type { ComponentProps, PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { SplitHandle } from './SplitHandle.js';
import { clampedSplit, SPLIT_AXES, type SplitDirection } from './split-axis.js';

type SplitPaneProps = PropsWithChildren<{
    className?: string | undefined;
    /**
     * The second half is closed: the first takes the whole pane and there is no line to drag.
     * The first half stays where it was in the tree, so what it holds is not drawn anew.
     */
    collapsed?: boolean | undefined;
    direction?: SplitDirection | undefined;
    /** Where a double click on the line puts it back. */
    initial?: number | undefined;
    label: string;
    max?: number | undefined;
    min?: number | undefined;
    onValueChange: (value: number) => void;
    value: number;
}>;

/**
 * Two regions and the line between them, without owning where that line sits.
 *
 * The halves are written inside it because they are the tree: a split that took them as two
 * props would hide both of them behind names, and the day a caller wanted a third region or a
 * different order it would have to change the split for everybody. The position is a number the
 * caller keeps, because who remembers it — a tab, a panel, nobody — is not a question a divider
 * can answer.
 */
export function SplitPane({
    children,
    className,
    collapsed = false,
    direction = 'row',
    initial,
    label,
    max = 70,
    min = 30,
    onValueChange,
    value,
}: SplitPaneProps) {
    const position = `${String(clampedSplit(value, min, max))}%`;

    return (
        <div
            className={cn('grid min-h-0 min-w-0 overflow-hidden', className)}
            data-collapsed={collapsed ? '' : undefined}
            data-direction={direction}
            data-part="split-pane"
            data-position={position}
        >
            {children}
            <OpenHandle
                axis={SPLIT_AXES[direction]}
                collapsed={collapsed}
                initial={initial}
                label={label}
                max={max}
                min={min}
                onValueChange={onValueChange}
                position={position}
                value={value}
            />
        </div>
    );
}

type OpenHandleProps = ComponentProps<typeof SplitHandle> & { collapsed: boolean };

/** The line between two halves, for as long as there are two. */
function OpenHandle({ collapsed, ...handle }: OpenHandleProps) {
    if (collapsed) {
        return null;
    }

    return <SplitHandle {...handle} />;
}
