import { failure, menuLanguageRequestSchema, success, CHANNELS } from '@mandor/ipc';

import type { HandlerIpc } from '../ipc/handler-ipc.js';
import type { AppMenuHolder } from './app-menu-holder.js';

export type MenuHandlerDeps = {
    /** The installed menu, which knows how to rebuild itself in another language. */
    holder: AppMenuHolder;
};

/**
 * The one channel where the renderer says what main has to say: the language preference lives
 * in the renderer, and the menu lives in main, so the language has to cross the bridge.
 */
export function registerMenuHandlers(ipc: HandlerIpc, deps: MenuHandlerDeps): () => void {
    ipc.handle(CHANNELS.menuLanguage, (_event, raw) => {
        const request = menuLanguageRequestSchema.safeParse(raw);

        if (!request.success) {
            return Promise.resolve(failure('bad-request', request.error.message));
        }

        deps.holder.speak(request.data.language);

        return Promise.resolve(success({}));
    });

    return () => {
        ipc.removeHandler(CHANNELS.menuLanguage);
    };
}
