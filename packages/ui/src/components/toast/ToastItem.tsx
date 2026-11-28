import { Toast as ToastPrimitive } from 'radix-ui';

import { cn } from '../../lib/cn.js';
import { durationFor, TOAST_ICONS, type ToastSpec, type ToastTone } from '../../lib/toast-queue.js';

import { Button } from '../button/Button.js';
import { IconButton } from '../button/IconButton.js';

/** An error is announced at once, over what is being read; the rest wait their turn. */
const TONE_URGENCY: Record<ToastTone, 'background' | 'foreground'> = {
    error: 'foreground',
    info: 'background',
    success: 'background',
    warning: 'background',
};

/**
 * The badge alone carries the state, tinted with its tone like a badge of status; the surface and
 * its edge stay the same for every tone.
 */
const TONE_BADGE_COLORS: Record<ToastTone, string> = {
    error: 'bg-surface-error-tint text-text-error',
    info: 'bg-surface-info-tint text-text-info',
    success: 'bg-surface-success-tint text-text-success',
    warning: 'bg-surface-warning-tint text-text-warning',
};

/** A card that floats over the window: the round of a dialog, the padding of a card. */
const ROOT_STYLES = [
    'flex items-start gap-pad-panel overflow-hidden rounded-overlay',
    'border border-border-subtle bg-surface-raised p-pad-panel shadow-dialog',
];

type ToastItemProps = {
    closeLabel: string;
    onDismiss: (id: string) => void;
    toast: ToastSpec;
};

/** One floating notice. Never the only copy of what it says. */
export function ToastItem({ closeLabel, onDismiss, toast }: ToastItemProps) {
    const Glyph = TOAST_ICONS[toast.tone];

    return (
        <ToastPrimitive.Root
            className={cn(ROOT_STYLES)}
            data-part="toast"
            data-tone={toast.tone}
            duration={durationFor(toast.tone)}
            onOpenChange={(open) => {
                if (!open) {
                    onDismiss(toast.id);
                }
            }}
            open
            type={TONE_URGENCY[toast.tone]}
        >
            {/* One read: the badge, the title and the way out share the band of the badge, so a
                notice of one line stands centred on it. The title cuts at two lines and the
                detail at three, so the tallest a notice ever grows is known before it is written. */}
            <span
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl',
                    TONE_BADGE_COLORS[toast.tone],
                )}
                data-part="toast-badge"
            >
                <Glyph />
            </span>
            <div className="flex min-h-8 min-w-0 flex-1 flex-col justify-center gap-gap-tight">
                <ToastPrimitive.Title className="line-clamp-2 text-sm font-semibold text-text-primary">
                    {toast.title}
                    <ToastCount count={toast.count} />
                </ToastPrimitive.Title>
                <ToastDetail detail={toast.detail} />
                <ToastAction action={toast.action} />
            </div>
            {/* The way out stands centred in the band of the badge, whatever the text below. */}
            <span className="flex min-h-8 shrink-0 flex-col justify-center">
                <ToastPrimitive.Close asChild>
                    <IconButton icon="close" label={closeLabel} />
                </ToastPrimitive.Close>
            </span>
        </ToastPrimitive.Root>
    );
}

function ToastCount({ count }: { count: ToastSpec['count'] }) {
    if (count <= 1) {
        return null;
    }

    // A pill of its own beside the title, so the count never reads as part of the sentence.
    return (
        <span
            className="ms-gap-icon-text inline-flex rounded-full bg-surface-control px-1.5 align-middle text-2xs font-semibold text-text-secondary"
            data-part="toast-count"
        >{`×${String(count)}`}</span>
    );
}

function ToastDetail({ detail }: { detail: ToastSpec['detail'] }) {
    if (detail === undefined) {
        return null;
    }

    return (
        <ToastPrimitive.Description className="line-clamp-3 text-xs break-words text-text-secondary">
            {detail}
        </ToastPrimitive.Description>
    );
}

function ToastAction({ action }: { action: ToastSpec['action'] }) {
    if (action === undefined) {
        return null;
    }

    // One secondary button under the text, a step below it; never a link and never a second row.
    return (
        <ToastPrimitive.Action altText={action.label} asChild className="mt-1.5 self-start">
            <Button onClick={action.onSelect} variant="secondary">
                {action.label}
            </Button>
        </ToastPrimitive.Action>
    );
}
