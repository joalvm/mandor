import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';
import { ChevronRightIcon } from '@mandor/icons';

type DisclosureProps = PropsWithChildren<{
    /** Something inside already holds a value: hiding it would hide what the form sends. */
    defaultOpen?: boolean | undefined;
    label: string;
}>;

/**
 * The part of a form that most readers never need, folded under one quiet line until asked
 * for. The line is a button, not a heading: it reads one step quieter than the fields, and its
 * chevron turns with it the way the header of a region does, by the rule in `runtime.css`.
 * Whether it is open is view state of the form; the owner only says how it starts.
 */
export function Disclosure({ children, defaultOpen = false, label }: DisclosureProps) {
    return (
        <CollapsiblePrimitive.Root
            className="flex min-w-0 flex-col gap-gap-group"
            data-part="disclosure"
            defaultOpen={defaultOpen}
        >
            <CollapsiblePrimitive.Trigger
                className="flex w-fit cursor-pointer items-center gap-gap-icon-text rounded-sm border-0 bg-transparent text-sm font-semibold text-text-secondary hover:text-text-primary"
                data-focus-ring=""
            >
                <span
                    className="flex shrink-0 items-center transition-transform duration-fast"
                    data-part="collapsible-chevron"
                >
                    <ChevronRightIcon size="sm" />
                </span>
                {label}
            </CollapsiblePrimitive.Trigger>
            <CollapsiblePrimitive.Content
                className="flex min-w-0 flex-col gap-gap-group"
                data-part="disclosure-body"
            >
                {children}
            </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
    );
}
