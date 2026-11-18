import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

/**
 * How much of a box a field draws: a sunken one for prose; only the edge, over the surface of the
 * panel, for a field that narrows what that panel shows (`SearchInput`); a transparent line for a
 * cell that still takes the focus on its own edge; or nothing at all, for a field inside a frame
 * that already draws the edge and takes the focus for everything it holds (`AddressBar`).
 */
export type FieldVariant = 'bare' | 'flat' | 'outline' | 'text';

const VARIANT_CLASSES = {
    bare: 'border-0 bg-transparent',
    flat: 'border-transparent bg-transparent',
    outline: 'border-border-strong bg-transparent hover:border-border-hover',
    text: 'border-border-strong bg-surface-sunken hover:border-border-hover',
} as const;

/**
 * How the box answers the focus: with the accent on its edge; with a quieter step for a field
 * that only narrows its panel (`focus.css`); or not at all, inside a frame that answers for it.
 */
const FOCUS_FRAME_OF_VARIANT = {
    bare: undefined,
    flat: '',
    outline: 'quiet',
    text: '',
} as const;

type FieldBoxProps = PropsWithChildren<{
    className?: string | undefined;
    disabled: boolean;
    invalid: boolean;
    variant: FieldVariant;
}>;

/**
 * The box a one-line field lives in: its border, its height and the frame it takes when what is
 * inside has the focus.
 *
 * A click anywhere in it puts the caret in the line it holds, which is what makes the padding
 * part of the field instead of a dead margin around it. A click on a button inside is that
 * button's, not the field's.
 */
export function FieldBox({ children, className, disabled, invalid, variant }: FieldBoxProps) {
    return (
        // markup-policy: forwards-focus — the box hands the click to the field it wraps.
        <div
            className={cn(
                'flex min-w-0 items-center gap-gap-icon-text px-pad-control',
                'font-ui text-sm',
                'h-field rounded-md border text-text-primary transition-colors duration-fast',
                VARIANT_CLASSES[variant],
                invalid && 'border-border-error hover:border-border-error',
                disabled &&
                    'cursor-not-allowed border-border-subtle bg-surface-control text-text-disabled hover:border-border-subtle',
                className,
            )}
            data-focus-frame={FOCUS_FRAME_OF_VARIANT[variant]}
            data-part="input"
            onClick={(event) => {
                const onButton =
                    event.target instanceof Element && event.target.closest('button') !== null;

                if (disabled || onButton) {
                    return;
                }

                event.currentTarget.querySelector<HTMLElement>('[data-part="editable"]')?.focus();
            }}
        >
            {children}
        </div>
    );
}
