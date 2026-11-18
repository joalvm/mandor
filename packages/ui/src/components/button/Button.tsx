import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, PropsWithChildren } from 'react';
import { LoadingIcon } from '@mandor/icons';

import { useDelayedFlag } from '../../hooks/useDelayedFlag.js';
import { cn } from '../../lib/cn.js';
import { DisabledControlTooltip } from '../tooltip/DisabledControlTooltip.js';

/**
 * A button on a surface is flat or drawn in outline, never both: a fill with a line around it
 * reads as a form control from another decade. `chrome` stands apart because it is seated in the
 * chrome of the window, where the line is the seam the chrome is drawn with. A filled button that
 * turns off gives its fill up, so a verb nobody can press keeps no colour that asks for it.
 *
 * `danger` is the one red that speaks of intention, and only the verb of a destructive
 * confirmation wears it, where the colour has to make the reader stop. Nowhere else: a menu
 * line or a toolbar button in red is the tripwire the rule of red exists to prevent.
 *
 * `link` is the verb that rides inside a sentence or a notice — "Retry", "Undo", "Show": a
 * button to the keyboard and to a reader of the screen, drawn as the accent text it sits among,
 * underlined under the pointer unless it is told not to be. It keeps the height of its size, so the target does not shrink
 * to the word.
 */
const buttonStyles = cva(
    [
        'relative inline-flex cursor-pointer items-center justify-center gap-gap-icon-text whitespace-nowrap',
        'rounded-md border text-sm transition-colors duration-fast ease-out',
        'disabled:cursor-not-allowed disabled:text-text-disabled',
    ],
    {
        variants: {
            variant: {
                primary:
                    'border-transparent bg-solid-accent text-text-on-solid-accent enabled:hover:bg-solid-accent-hover enabled:active:bg-solid-accent-active disabled:bg-surface-control',
                secondary:
                    'border-border-strong bg-transparent text-text-primary enabled:hover:border-border-hover enabled:hover:bg-surface-control-hover enabled:active:bg-surface-control-active disabled:border-border-subtle',
                danger: 'border-transparent bg-solid-danger text-text-on-solid-danger enabled:hover:bg-solid-danger-hover enabled:active:bg-solid-danger-active disabled:bg-surface-control',
                ghost: 'border-transparent bg-transparent text-text-primary enabled:hover:bg-surface-control-hover enabled:active:bg-surface-control-active',
                chrome: 'border-border-chrome bg-surface-chrome-control text-text-primary enabled:hover:bg-surface-chrome-control-hover',
                link: 'border-transparent bg-transparent text-text-accent underline-offset-2 enabled:hover:underline',
            },
            size: {
                sm: 'h-control-sm px-pad-control',
                md: 'h-control px-3',
            },
        },
        defaultVariants: { variant: 'secondary', size: 'md' },
    },
);

/** The six looks a button has, named so a wrapper can pass one through. */
export type ButtonVariant = NonNullable<VariantProps<typeof buttonStyles>['variant']>;

type ButtonProps = PropsWithChildren<
    Omit<ComponentProps<'button'>, 'disabled'> &
        VariantProps<typeof buttonStyles> & {
            disabled?: boolean | undefined;
            disabledReason?: string | undefined;
            loading?: boolean | undefined;
            /** Only for `link`: whether the pointer underlines it. A verb that stands alone and
                is plainly a verb, like "Beautify" in a band, can do without. */
            underlined?: boolean | undefined;
        }
>;

/**
 * Runs a labelled action, with shared density, focus and pending behaviour.
 *
 * Whatever the button shows is written inside it — a word, a glyph and a word, a glyph alone —
 * so there is no glyph prop deciding a side for the caller and no second component to reach for
 * when the glyph should go after the text.
 *
 * While the action is pending the spinner is laid over the contents rather than put beside them:
 * a button that grew by an icon the moment it was pressed would move everything in the row it
 * stands in, and the pointer would end up over whatever slid under it.
 */
export function Button({
    children,
    className,
    disabled = false,
    disabledReason,
    loading = false,
    size,
    underlined = true,
    variant,
    ...props
}: ButtonProps) {
    const showPending = useDelayedFlag(loading);
    const reason = disabled ? disabledReason : undefined;
    const control = (
        <button
            {...props}
            aria-busy={loading}
            className={cn(
                buttonStyles({ size, variant }),
                !underlined && 'enabled:hover:no-underline',
                className,
            )}
            data-focus-frame=""
            data-variant={variant ?? 'secondary'}
            disabled={disabled || loading}
            type={props.type ?? 'button'}
        >
            <span
                className={cn('contents', showPending && 'text-transparent')}
                data-part="button-contents"
            >
                {children}
            </span>
            <ButtonPending active={showPending} />
        </button>
    );

    return <DisabledControlTooltip reason={reason}>{control}</DisabledControlTooltip>;
}

function ButtonPending({ active }: { active: boolean }) {
    if (!active) {
        return null;
    }

    return (
        <span
            className="absolute inset-0 flex items-center justify-center"
            data-part="button-pending"
        >
            <LoadingIcon />
        </span>
    );
}
