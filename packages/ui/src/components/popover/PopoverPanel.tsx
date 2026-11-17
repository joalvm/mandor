import { Popover as PopoverPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

type PopoverPanelProps = PropsWithChildren<{
    /**
     * Whether the panel takes the focus when it opens. A panel the user asked for takes it;
     * a panel the pointer opened leaves it where it was — the field under it is still being
     * typed into.
     */
    autofocus?: boolean | undefined;
    label: string;
}>;

/** What the popover opens: a small form, named so it can be reached without seeing it. */
export function PopoverPanel({ autofocus = true, children, label }: PopoverPanelProps) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                align="start"
                aria-label={label}
                className="z-popover w-80 rounded-lg border border-border-strong bg-surface-raised p-3 text-sm text-text-primary shadow-popover"
                onOpenAutoFocus={(event) => {
                    if (!autofocus) {
                        event.preventDefault();
                    }
                }}
                role="dialog"
                sideOffset={4}
            >
                {children}
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
    );
}
