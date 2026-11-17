import { createContext, useContext } from 'react';

import type { ToastRequest } from '../lib/toast-queue.js';

export type ToastApi = {
    dismiss: (id: string) => void;
    notify: (request: ToastRequest) => void;
};

export const ToastContext = createContext<ToastApi | undefined>(undefined);

/** Raises a notice from anywhere under the provider. Throws outside it, on purpose. */
export function useToast(): ToastApi {
    const api = useContext(ToastContext);

    if (api === undefined) {
        throw new Error('useToast requires a ToastProvider above it.');
    }

    return api;
}
