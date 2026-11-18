import { cva, type VariantProps } from 'class-variance-authority';
import { useContext, type ComponentProps } from 'react';
import { Icon, type IconName } from '@mandor/icons';

import { cn } from '../../lib/cn.js';
import { HeaderActionsContext } from '../collapsible/CollapsibleHeader.js';
import { DisabledControlTooltip } from '../tooltip/DisabledControlTooltip.js';
import { Tooltip } from '../tooltip/Tooltip.js';

const iconButtonStyles = cva(
    [
        'inline-flex cursor-pointer items-center justify-center rounded-md border border-transparent',
        'text-text-primary transition-colors duration-fast ease-out',
        'enabled:active:bg-surface-control-active',
        'disabled:cursor-not-allowed disabled:text-text-disabled',
    ],
    {
        variants: {
            size: {
                compact: 'size-control-xs',
                xs: 'size-icon-md',
                sm: 'size-control-sm',
                md: 'size-control',
            },
            // Pressed in, the box keeps its fill under the pointer and only takes the veil.
            active: {
                true: 'bg-surface-selected enabled:hover:veil',
                false: 'bg-transparent enabled:hover:bg-surface-control-hover',
            },
        },
        defaultVariants: { size: 'sm', active: false },
    },
);

/** The glyph a box holds when the caller names none: the small one in the tight boxes. */
const GLYPH_OF_BOX = {
    compact: 'sm',
    md: 'md',
    sm: 'md',
    xs: 'sm',
} as const;

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label' | 'disabled' | 'title'> &
    Omit<VariantProps<typeof iconButtonStyles>, 'size'> & {
        disabled?: boolean | undefined;
        disabledReason?: string | undefined;
        icon: IconName;
        /** Defaults to the small glyph inside the xs square, so the box keeps air around it. */
        iconSize?: 'md' | 'sm' | undefined;
        label: string;
        /** Under the header of a section the box is the header's own, whatever is asked here. */
        size?: 'md' | 'sm' | 'xs' | undefined;
    };

/**
 * Runs a compact action whose required label feeds accessibility and tooltip text.
 *
 * The label is never also a `title`. The window draws its own tooltip, and the browser puts
 * the native one up a second later beside it: two panels, two shapes, saying one thing.
 */
export function IconButton({
    active,
    className,
    disabled = false,
    disabledReason,
    icon,
    iconSize,
    label,
    size,
    ...props
}: IconButtonProps) {
    // Beside the title of a section the button is part of the header: the compact box, the small
    // glyph and the quiet ink, whatever box the caller asked for.
    const inHeader = useContext(HeaderActionsContext);
    const boxSize = inHeader ? 'compact' : (size ?? 'sm');
    const glyphSize = iconSize ?? GLYPH_OF_BOX[boxSize];
    const control = (
        <button
            {...props}
            aria-label={label}
            aria-pressed={active ?? undefined}
            className={cn(
                iconButtonStyles({ active, size: boxSize }),
                inHeader && 'text-text-secondary',
                className,
            )}
            data-focus-frame=""
            disabled={disabled}
            type={props.type ?? 'button'}
        >
            <Icon name={icon} size={glyphSize} />
        </button>
    );

    if (disabled) {
        return <DisabledControlTooltip reason={disabledReason}>{control}</DisabledControlTooltip>;
    }

    return <Tooltip content={label}>{control}</Tooltip>;
}
