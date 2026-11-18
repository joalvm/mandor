import type { StatusFamily } from './format-response.js';

/**
 * The colour of a status says how the exchange ended: green when it went through, red when
 * either side refused it. It is one table because the summary of an answer and the row of a
 * stored send draw the same number, and the same number has to read the same in both.
 */
export const STATUS_TONE: Record<StatusFamily, string> = {
    'client-error': 'text-text-error',
    informational: 'text-text-secondary',
    redirect: 'text-text-info',
    'server-error': 'text-text-error',
    success: 'text-text-success',
};

/** The ground of the pill the summary draws the status on: the tint of the same tone. */
export const STATUS_TINT: Record<StatusFamily, string> = {
    'client-error': 'bg-surface-error-tint',
    informational: 'bg-surface-control',
    redirect: 'bg-surface-info-tint',
    'server-error': 'bg-surface-error-tint',
    success: 'bg-surface-success-tint',
};
