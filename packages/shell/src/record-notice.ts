import type { LogTone, ToastRequest, ToastTone } from '@mandor/ui';

import { tellWindowConsole } from './console/window-console.js';
import { shellStore } from './shell-store.js';

/** How a notice reads in the console: a success is news like any other. */
const NOTICE_TONES: Record<ToastTone, LogTone> = {
    error: 'error',
    info: 'info',
    success: 'info',
    warning: 'warn',
};

/**
 * Keeps a notice in the centre and writes it to the console. The window mounts it as the listener of its toasts, so every
 * warning and every error is read twice: once on the corner, once here after the toast is gone. The console keeps every notice, the
 * news too, as a browser keeps what its page printed.
 */
export function recordNotice(request: ToastRequest): void {
    shellStore.getState().addNotice(request);
    tellWindowConsole({
        tone: NOTICE_TONES[request.tone],
        text: request.title,
        detail: request.detail,
    });
}
