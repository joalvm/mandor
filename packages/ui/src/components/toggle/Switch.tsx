import { Switch as SwitchPrimitive } from 'radix-ui';
import { useId } from 'react';

import { cn } from '../../lib/cn.js';
import { useFieldWiring } from '../input/field-wiring.js';

type SwitchProps = {
    checked: boolean;
    className?: string | undefined;
    disabled?: boolean | undefined;
    label: string;
    onCheckedChange: (checked: boolean) => void;
    /**
     * Writes the name beside the pill, as a label that turns the switch with a click. A
     * switch inside a `Field` needs no copy of it — the field's own label is already its
     * label — and a row that names it at its side keeps naming it there.
     */
    withLabel?: boolean | undefined;
};

/**
 * One setting, on or off: a pill and its knob, and the state in the fill. The label is the
 * control's name — what is being turned — never a description of the act of turning it. What
 * the state paints lives in `runtime.css`, by the part each half answers to.
 */
export function Switch({
    checked,
    className,
    disabled = false,
    label,
    onCheckedChange,
    withLabel = false,
}: SwitchProps) {
    // Inside a `Field` the id and the message come from it; on its own, an id of its own, so
    // the name written beside the pill can reach it and turn it.
    const wiring = useFieldWiring({});
    const ownId = useId();
    const id = wiring.id ?? ownId;

    const pill = (
        <SwitchPrimitive.Root
            aria-describedby={wiring.describedBy}
            aria-label={withLabel ? undefined : label}
            checked={checked}
            className={cn(
                'inline-flex h-control-xs w-toggle shrink-0 items-center rounded-full border border-transparent p-pad-toggle',
                'transition-colors duration-fast disabled:cursor-not-allowed',
                className,
            )}
            data-focus-frame=""
            data-part="switch"
            disabled={disabled}
            id={id}
            onCheckedChange={onCheckedChange}
        >
            <SwitchPrimitive.Thumb
                className="size-icon-md rounded-full bg-surface-app transition-transform duration-fast"
                data-part="switch-thumb"
            />
        </SwitchPrimitive.Root>
    );

    if (!withLabel) {
        return pill;
    }

    return (
        <span className="inline-flex items-center gap-gap-icon-text" data-part="switch-labeled">
            {pill}
            <label className="cursor-pointer text-xs text-text-secondary" htmlFor={id}>
                {label}
            </label>
        </span>
    );
}
