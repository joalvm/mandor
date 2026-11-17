import type { ToastRequest } from '@mandor/ui';

import { shellStore } from './shell-store.js';

/**
 * Keeps a notice in the centre. The window mounts it as the listener of its toasts, so every
 * warning and every error is read twice: once on the corner, once here after the toast is gone.
 */
export function recordNotice(request: ToastRequest): void {
    shellStore.getState().addNotice(request);
}
