import { cva, type VariantProps } from 'class-variance-authority';
import { Icon, type IconName } from '@mandor/icons';

import { cn } from '../../lib/cn.js';

const windowButtonStyles = cva(
    [
        'flex h-full w-12 shrink-0 cursor-pointer items-center justify-center border border-transparent bg-transparent',
        'text-text-primary transition-colors duration-fast ease-out',
    ],
    {
        variants: {
            variant: {
                chrome: 'hover:bg-surface-control-hover active:bg-surface-control-active',
                close: 'hover:bg-surface-window-close-hover hover:text-text-on-window-close active:bg-surface-window-close-active',
            },
        },
        defaultVariants: { variant: 'chrome' },
    },
);

type WindowButtonProps = VariantProps<typeof windowButtonStyles> & {
    icon: IconName;
    label: string;
    onClick: () => void;
};

/**
 * One of the buttons that command the window itself, carved out of the title row.
 *
 * It is not an `IconButton` with another look: it spans the whole height of the row and its own
 * column of it, with no rounding and no inset, because the corner of the window has to close the
 * window and a rounded control leaves a strip of title bar that swallows the click.
 *
 * Red is a variant and not a colour a caller passes, so the only button that wears it is the one
 * that closes, and it wears it only under the pointer that is about to press it.
 */
export function WindowButton({ icon, label, onClick, variant }: WindowButtonProps) {
    return (
        <button
            aria-label={label}
            className={cn(windowButtonStyles({ variant }))}
            data-focus-frame=""
            data-part="window-button"
            onClick={onClick}
            type="button"
        >
            <Icon name={icon} />
        </button>
    );
}
