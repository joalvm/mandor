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

type ToastMessages = {
    close: string;
    more: (count: number) => string;
};

const VIEWPORT_STYLES =
    'fixed right-gap-group bottom-gap-group z-toast flex w-toast list-none flex-col gap-gap-control';

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

    return (
        <ToastContext.Provider value={api}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}
                <ToastPrimitive.Viewport className={VIEWPORT_STYLES}>
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
