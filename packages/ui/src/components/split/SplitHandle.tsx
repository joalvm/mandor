import type { KeyboardEvent } from 'react';

import { usePointerDrag } from '../../hooks/usePointerDrag.js';
import { cn } from '../../lib/cn.js';
import { clampedSplit, keyboardDelta, stepOf, type SplitAxis } from './split-axis.js';

type SplitHandleProps = {
    /** Where a double click puts the line back. */
    initial?: number | undefined;
    axis: SplitAxis;
    label: string;
    max: number;
    min: number;
    onValueChange: (value: number) => void;
    /** The share the grid took, as the pane writes it: the line reads the same number. */
    position: string;
    value: number;
};

/**
 * The divider, and the only part of a split that moves.
 *
 * It floats over the two halves instead of sitting in a track of its own, so the halves take the
 * whole box and land where the grid puts them: the caller writes two children and gets two
 * halves, without a third one to account for.
 */
export function SplitHandle({
    axis,
    initial = 50,
    label,
    max,
    min,
    onValueChange,
    position,
    value,
}: SplitHandleProps) {
    const drag = usePointerDrag((event, container) => {
        const bounds = container.getBoundingClientRect();
        const size = axis.sizeOf(bounds);

        if (size === 0) {
            return;
        }

        onValueChange(
            clampedSplit(((axis.pointOf(event) - axis.startOf(bounds)) / size) * 100, min, max),
        );
    });

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        const step = stepOf(event.key, axis);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        onValueChange(clampedSplit(value + keyboardDelta(event, axis) * step, min, max));
    }

    return (
        <div
            aria-label={label}
            aria-orientation={axis.orientation}
            aria-valuemax={max}
            aria-valuemin={min}
            aria-valuenow={Math.round(value)}
            className={cn(
                'z-splitter border-transparent before:absolute before:bg-border-subtle',
                'hover:before:bg-border-hover active:before:bg-border-hover',
                axis.handle,
            )}
            data-focus-ring=""
            data-part="split-handle"
            data-position={position}
            {...drag}
            onDoubleClick={() => {
                onValueChange(initial);
            }}
            onKeyDown={onKeyDown}
            role="separator"
            tabIndex={0}
        />
    );
}
