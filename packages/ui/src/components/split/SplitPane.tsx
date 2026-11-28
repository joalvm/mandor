import { useRef, type ComponentProps, type PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { SplitHandle } from './SplitHandle.js';
import { useWritingDirection } from '../../hooks/useWritingDirection.js';
import { clampedSplit, splitAxisOf } from './split-axis.js';
import { useFitDirection, type SplitLayout } from './useFitDirection.js';

type SplitPaneProps = PropsWithChildren<{
    className?: string | undefined;
    /**
     * The second half is closed: the first takes the whole pane and there is no line to drag.
     * The first half stays where it was in the tree, so what it holds is not drawn anew.
     */
    collapsed?: boolean | undefined;
    /**
     * Beside, under, or `fit`: beside while the pane is wide enough for two halves to be read,
     * under once it is not — a group among four, or a panel dragged narrow.
     */
    direction?: SplitLayout | undefined;
    /**
     * What stands between the halves: nothing, when both live in one card, or the gutter of the
     * frame, when each half is a card of its own and the handle lives in the gutter.
     */
    gap?: 'none' | 'gutter' | undefined;
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
    gap = 'none',
    initial,
    label,
    max = 70,
    min = 30,
    onValueChange,
    value,
}: SplitPaneProps) {
    const position = `${String(clampedSplit(value, min, max))}%`;
    const box = useRef<HTMLDivElement>(null);
    const standing = useFitDirection(box, direction);
    const writing = useWritingDirection();

    return (
        <div
            className={cn('grid min-h-0 min-w-0 overflow-hidden', className)}
            data-collapsed={collapsed ? '' : undefined}
            data-direction={standing}
            data-gap={gap}
            data-part="split-pane"
            data-position={position}
            ref={box}
        >
            {children}
            <OpenHandle
                axis={splitAxisOf(standing, writing)}
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
