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

/** The glyph alone carries the state; the surface and its edge stay the same for every tone. */
const TONE_ICON_COLORS: Record<ToastTone, string> = {
    error: 'text-text-error',
    info: 'text-text-info',
    success: 'text-text-success',
    warning: 'text-text-warning',
};

const ROOT_STYLES = [
    'flex items-start gap-gap-icon-text overflow-hidden rounded-lg',
    'border border-border-subtle bg-surface-raised py-2 pr-2 pl-3 shadow-popover',
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
            {/* One read, one line: the glyph, the first line of the title and the way out share
                it, each centred on it. The title cuts at two lines and the detail at three, so
                the tallest a notice ever grows is known before it is written. */}
            <span className={cn('shrink-0', TONE_ICON_COLORS[toast.tone])}>
                <Glyph />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-gap-tight">
                <ToastPrimitive.Title className="line-clamp-2 text-sm text-text-primary">
                    {toast.title}
                    <ToastCount count={toast.count} />
                </ToastPrimitive.Title>
                <ToastDetail detail={toast.detail} />
                <ToastAction action={toast.action} />
            </div>
            <ToastPrimitive.Close asChild>
                {/* The square rides up half its own padding, so the cross sits on the title's
                    line: a 24px hit area, centred on a 16px line of text. */}
                <IconButton className="-mt-1 shrink-0" icon="close" label={closeLabel} />
            </ToastPrimitive.Close>
        </ToastPrimitive.Root>
    );
}

function ToastCount({ count }: { count: ToastSpec['count'] }) {
    if (count <= 1) {
        return null;
    }

    return (
        <span className="ml-gap-icon-text text-xs text-text-secondary">{`×${String(count)}`}</span>
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

    // The verb reads as a link in the text it follows, so its word starts where the title does.
    return (
        <ToastPrimitive.Action
            altText={action.label}
            asChild
            className="-ml-pad-control self-start"
        >
            <Button onClick={action.onSelect} size="sm" variant="link">
                {action.label}
            </Button>
        </ToastPrimitive.Action>
    );
}
