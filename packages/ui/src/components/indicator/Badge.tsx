import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';

type BadgeProps = PropsWithChildren<{
    'aria-label'?: string | undefined;
    className?: string | undefined;
    count?: boolean | undefined;
    tone?: 'accent' | 'error' | 'info' | 'neutral' | 'success' | 'warning' | undefined;
}>;

const TONE_CLASSES = {
    accent: 'bg-surface-accent-tint text-text-accent',
    error: 'bg-surface-error-tint text-text-error',
    info: 'bg-surface-info-tint text-text-info',
    neutral: 'bg-surface-control text-text-secondary',
    success: 'bg-surface-success-tint text-text-success',
    warning: 'bg-surface-warning-tint text-text-warning',
} as const;

/** Marks a short classification or count without behaving like a control. */
export function Badge({
    'aria-label': ariaLabel,
    children,
    className,
    count = false,
    tone = 'neutral',
}: BadgeProps) {
    return (
        <span
            aria-label={ariaLabel}
            className={cn(
                'inline-flex h-4 items-center justify-center gap-gap-tight rounded-sm px-1 text-2xs',
                count && 'min-w-4 tabular',
                TONE_CLASSES[tone],
                className,
            )}
            data-part="badge"
            data-tone={tone}
        >
            {children}
        </span>
    );
}
