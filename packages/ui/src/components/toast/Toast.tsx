import { Toast as ToastPrimitive } from 'radix-ui';
import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { ToastContext, type ToastApi } from '../../hooks/useToast.js';
import {
    enqueueToast,
    visibleToasts,
    type ToastRequest,
    type ToastSpec,
} from '../../lib/toast-queue.js';

import { ToastItem } from './ToastItem.js';
import { useToastStack } from './useToastStack.js';

type ToastMessages = {
    close: string;
    more: (count: number) => string;
};

/** Where the stack stands; how it piles up and opens is written in `runtime.css`. */
const VIEWPORT_STYLES = 'fixed right-gap-group bottom-gap-group z-toast w-toast list-none';

type ToastProviderProps = PropsWithChildren<{
    messages: ToastMessages;
    /** Hears every notice, folded or not: the keeper of the record is not the stack. */
    onNotify?: ((request: ToastRequest) => void) | undefined;
}>;

/**
 * The only ephemeral channel of the app. Anything that has to survive a blink belongs to the
 * activity log instead, so a toast is always a second copy and never the record itself.
 */
export function ToastProvider({ children, messages, onNotify }: ToastProviderProps) {
    const [queue, setQueue] = useState<readonly ToastSpec[]>([]);
    const issued = useRef(0);
    const viewport = useRef<HTMLOListElement>(null);

    const dismiss = useCallback((id: string) => {
        setQueue((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const notify = useCallback(
        (request: ToastRequest) => {
            issued.current += 1;

            const id = `toast-${String(issued.current)}`;

            setQueue((current) => enqueueToast(current, request, id));
            onNotify?.(request);
        },
        [onNotify],
    );

    const api = useMemo<ToastApi>(() => ({ dismiss, notify }), [dismiss, notify]);
    const { hidden, shown } = visibleToasts(queue);

    useToastStack(viewport, shown.map((toast) => toast.id).join(' '));

    return (
        <ToastContext.Provider value={api}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}
                <ToastPrimitive.Viewport
                    className={VIEWPORT_STYLES}
                    data-part="toast-viewport"
                    ref={viewport}
                >
                    <ToastOverflow hidden={hidden} messages={messages} />
                    {shown.map((toast) => (
                        <ToastItem
                            closeLabel={messages.close}
                            key={toast.id}
                            onDismiss={dismiss}
                            toast={toast}
                        />
                    ))}
                </ToastPrimitive.Viewport>
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
}

function ToastOverflow({ hidden, messages }: { hidden: number; messages: ToastMessages }) {
    if (hidden === 0) {
        return null;
    }

    return (
        <li className="px-pad-control text-xs text-text-secondary" data-part="toast-overflow">
            {messages.more(hidden)}
        </li>
    );
}
