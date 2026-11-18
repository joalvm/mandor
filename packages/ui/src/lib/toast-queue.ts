import { CheckIcon, ErrorIcon, InfoIcon, WarningIcon, type IconComponent } from '@mandor/icons';

export type ToastTone = 'error' | 'info' | 'success' | 'warning';

export type ToastAction = {
    label: string;
    onSelect: () => void;
};

/** What a caller asks for. The queue owns the identity. */
export type ToastRequest = {
    action?: ToastAction | undefined;
    detail?: string | undefined;
    /** What makes two notices the same one. Without it, the tone and the title do. */
    key?: string | undefined;
    title: string;
    tone: ToastTone;
};

export type ToastSpec = ToastRequest & { count: number; id: string; key: string };

/** Four is a wall of text in the corner. The rest only get counted. */
const VISIBLE_LIMIT = 3;

const TONE_DURATIONS: Record<ToastTone, number> = {
    success: 4000,
    info: 4000,
    warning: 6000,
    // A failure the user has not read yet is not a failure they have been told about.
    error: Number.POSITIVE_INFINITY,
};

export const TOAST_ICONS: Record<ToastTone, IconComponent> = {
    error: ErrorIcon,
    info: InfoIcon,
    success: CheckIcon,
    warning: WarningIcon,
};

export function durationFor(tone: ToastTone): number {
    return TONE_DURATIONS[tone];
}

/**
 * Adds a notice, or folds it into the one on screen with the same key: the count goes up, the
 * latest text wins and the new `id` restarts the timer of the toast it lands on.
 */
export function enqueueToast(
    queue: readonly ToastSpec[],
    request: ToastRequest,
    id: string,
): readonly ToastSpec[] {
    const key = request.key ?? `${request.tone}:${request.title}`;
    const present = queue.find((toast) => toast.key === key);

    if (present === undefined) {
        return [...queue, { ...request, count: 1, id, key }];
    }

    return queue.map((toast) =>
        toast === present ? { ...request, count: present.count + 1, id, key } : toast,
    );
}

/** The newest stay readable at the bottom; everything older collapses into a count. */
export function visibleToasts(queue: readonly ToastSpec[]): {
    hidden: number;
    shown: readonly ToastSpec[];
} {
    const start = Math.max(0, queue.length - VISIBLE_LIMIT);

    return { hidden: start, shown: queue.slice(start) };
}
