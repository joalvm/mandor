import type { PropsWithChildren } from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { ChevronDownIcon } from '@mandor/icons';

import { cn } from '../../lib/cn.js';
import { DisabledControlTooltip } from '../tooltip/DisabledControlTooltip.js';
import { useFieldWiring } from './field-wiring.js';
import { chosenOf, isOptionGroup, shownLinesOf } from './select-entries.js';

type Option<V extends string = string> = {
    disabled?: boolean | undefined;
    label: string;
    value: V;
};

/** Options that belong together, under a name of their own and a rule from the ones before. */
type OptionGroup<V extends string = string> = {
    label: string;
    options: readonly Option<V>[];
};

const ITEM =
    'flex h-row-xs cursor-pointer items-center whitespace-nowrap rounded-md px-2 text-xs data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-highlighted:bg-surface-control-hover text-justify';

function SelectItem({ option }: { option: Option }) {
    return (
        <SelectPrimitive.Item
            className={ITEM}
            data-part="select-item"
            disabled={option.disabled ?? false}
            value={option.value}
        >
            {/* The chosen line is told by weight, and the weight is the sheet's, by the part: no
                glyph, and no column held open for one — a list of plain words stays flush. */}
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}

function SelectRule({ first }: { first: boolean }) {
    if (first) {
        return null;
    }

    return (
        <SelectPrimitive.Separator
            className="my-1 h-px bg-border-subtle"
            data-part="select-separator"
        />
    );
}

/** A group of options: a rule from the group before, its name, quiet and not choosable, and its lines. */
function SelectGroup({ first, group }: { first: boolean; group: OptionGroup }) {
    return (
        <SelectPrimitive.Group data-part="select-group">
            <SelectRule first={first} />
            <SelectPrimitive.Label className="flex h-row-xs items-center px-2 text-xs text-text-secondary">
                {group.label}
            </SelectPrimitive.Label>
            {group.options.map((option) => (
                <SelectItem key={option.value} option={option} />
            ))}
        </SelectPrimitive.Group>
    );
}

/**
 * The box of an input (`FieldBox`): its border, its sunken ground, its height and its quiet
 * disabled state. Only the chevron and the text nobody types tell the two apart.
 */
const TRIGGER_BOX = [
    'flex h-field min-w-0 items-center justify-between gap-gap-icon-text overflow-hidden px-pad-control',
    'rounded-md border border-border-strong bg-surface-sunken font-ui text-sm text-text-primary text-justify',
    'transition-colors duration-fast enabled:hover:border-border-hover aria-expanded:border-border-hover',
    'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-control disabled:text-text-disabled',
].join(' ');

type SelectProps<V extends string> = {
    className?: string | undefined;
    disabled?: boolean | undefined;
    disabledReason?: string | undefined;
    /** The trigger is as wide as the text chosen, and moves with it, instead of holding the width
        of the longest line: for a pill that wears its value like text. */
    fitChosen?: boolean | undefined;
    label: string;
    /** Called with one of the values of the options, typed as they are: never any other text. */
    onValueChange: (value: V) => void;
    /** Plain options, or groups of them under a name. They alone decide the type of a value. */
    options: readonly (Option<V> | OptionGroup<V>)[];
    placeholder?: string | undefined;
    /** The chosen value; `undefined` shows the placeholder. The trigger stays controlled for
        life, so a caller that starts without a choice never flips uncontrolled → controlled. */
    value?: NoInfer<V> | undefined;
};

/**
 * Chooses one value through a themed Radix list instead of a native select. The trigger names
 * the choice beside its chevron, in the box of an input, in a form as much as in a band.
 */
export function Select<V extends string>({
    className,
    disabled = false,
    disabledReason,
    fitChosen = false,
    label,
    onValueChange,
    options,
    placeholder,
    value,
}: SelectProps<V>) {
    const pending = value === undefined || value === '';

    return (
        <SelectPrimitive.Root
            disabled={disabled}
            onValueChange={(next) => {
                const chosen = chosenOf(options, next);

                if (chosen !== undefined) {
                    onValueChange(chosen);
                }
            }}
            value={pending ? '' : value}
        >
            <DisabledControlTooltip reason={disabled ? disabledReason : undefined}>
                <SelectTrigger className={className} label={label}>
                    <SelectShown
                        disabled={disabled}
                        lines={fitChosen ? [] : shownLinesOf(options, placeholder)}
                        pending={pending}
                        placeholder={placeholder}
                    />
                </SelectTrigger>
            </DisabledControlTooltip>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className="z-dropdown overflow-hidden rounded-lg border border-border-strong bg-surface-raised text-text-primary shadow-popover"
                    data-part="select-content"
                    position="popper"
                    sideOffset={4}
                >
                    <SelectPrimitive.Viewport className="p-1">
                        {options.map((entry, index) => (
                            <SelectEntry
                                entry={entry}
                                first={index === 0}
                                key={isOptionGroup(entry) ? entry.label : entry.value}
                            />
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}

function SelectEntry({ entry, first }: { entry: Option | OptionGroup; first: boolean }) {
    if (isOptionGroup(entry)) {
        return <SelectGroup first={first} group={entry} />;
    }

    return <SelectItem option={entry} />;
}

type SelectTriggerProps = PropsWithChildren<Pick<SelectProps<string>, 'className' | 'label'>>;

function SelectTrigger({ children, className, label }: SelectTriggerProps) {
    // Inside a `Field` the id and the message come from it; a list on its own runs unwired.
    const wiring = useFieldWiring({});

    return (
        <SelectPrimitive.Trigger
            aria-describedby={wiring.describedBy}
            aria-invalid={wiring.invalid || undefined}
            aria-label={label}
            className={cn(
                TRIGGER_BOX,
                wiring.invalid &&
                    'border-border-error text-text-error enabled:hover:border-border-error',
                className,
            )}
            data-focus-frame=""
            data-part="select-trigger"
            id={wiring.id}
        >
            {children}
            <span aria-hidden="true" className="flex shrink-0 items-center text-text-secondary">
                <ChevronDownIcon size="sm" />
            </span>
        </SelectPrimitive.Trigger>
    );
}

type SelectShownProps = Pick<SelectProps<string>, 'placeholder'> & {
    disabled: boolean;
    /** Every text the trigger can show: the widest sets its width. */
    lines: readonly string[];
    pending: boolean;
};

/**
 * The text in the trigger, as wide as the longest one it can show, the way a native select is:
 * a choice never moves the edge. The other texts lie in the same cell, unseen and unread; their
 * words come from the sheet, so the trigger holds no text but the chosen one.
 */
function SelectShown({ disabled, lines, pending, placeholder }: SelectShownProps) {
    return (
        <span className="grid min-w-0 grid-cols-1">
            {/* Radix re-renders the chosen label on a span of its own, so the one-line
                contract lives on a wrapper of ours: the value shrinks and cuts, never wraps.
                A placeholder is pending text, so it carries the tone of pending text. */}
            <span
                className={cn(
                    'col-start-1 row-start-1 min-w-0 truncate',
                    pending && !disabled && 'text-text-secondary',
                )}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
            </span>
            {lines.map((line) => (
                <span
                    aria-hidden="true"
                    className="invisible col-start-1 row-start-1 overflow-hidden whitespace-nowrap"
                    data-label={line}
                    data-part="select-sizer"
                    key={line}
                />
            ))}
        </span>
    );
}
