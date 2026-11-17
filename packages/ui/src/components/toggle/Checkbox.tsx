import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { MouseEventHandler } from 'react';
import { CheckIcon, DashIcon } from '@mandor/icons';

import { cn } from '../../lib/cn.js';
import { useFieldWiring } from '../input/field-wiring.js';
import { useRowNameId } from '../row/row-name.js';

type CheckboxProps = {
    /** `indeterminate` is for a parent whose children disagree: some in, some out. */
    checked: boolean | 'indeterminate';
    className?: string | undefined;
    disabled?: boolean | undefined;
    label: string;
    onCheckedChange: (checked: boolean) => void;
    /** For rows that act on a click too: the checkbox stops the fall-through itself. */
    onClick?: MouseEventHandler | undefined;
};

/**
 * Marks one line of a list as in or out of what the list stands for. Inside a row it is reached
 * through the row, which holds the one tab stop of the line and marks with space: a stop in
 * every row would walk the list one box at a time.
 */
export function Checkbox({
    checked,
    className,
    disabled = false,
    label,
    onCheckedChange,
    onClick,
}: CheckboxProps) {
    // Inside a `Field` the id and the message come from it; a checkbox on its own runs unwired.
    const wiring = useFieldWiring({});
    const mixed = checked === 'indeterminate';
    const inRow = useRowNameId() !== undefined;

    return (
        <CheckboxPrimitive.Root
            aria-describedby={wiring.describedBy}
            aria-invalid={wiring.invalid || undefined}
            aria-label={label}
            checked={checked}
            className={cn(
                // Every fill lives in `runtime.css`, by the part: a colour utility here would
                // sit in the utilities layer, above every layered rule, and neither the checked
                // accent nor the error border would ever reach the screen. What stays here is
                // shape, and the one dimming that must win: a disabled box keeps its state under
                // an opacity, so a checked one still reads as checked.
                'flex size-icon-md shrink-0 items-center justify-center rounded-md border',
                'transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            data-focus-frame=""
            data-part="checkbox"
            disabled={disabled}
            id={wiring.id}
            onCheckedChange={onCheckedChange}
            onClick={onClick}
            tabIndex={inRow ? -1 : undefined}
        >
            <CheckboxPrimitive.Indicator>
                <CheckboxMark mixed={mixed} />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

function CheckboxMark({ mixed }: { mixed: boolean }) {
    if (mixed) {
        return <DashIcon size="sm" />;
    }

    return <CheckIcon size="sm" />;
}
