import {
    appearanceConfigureRequestSchema,
    CHANNELS,
    success,
    type AppearanceSource,
} from '@mandor/ipc';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';

export type AppearanceHandlerDeps = {
    /** Tells the system which colour scheme to draw the parts of the window it owns in. */
    setSource: (source: AppearanceSource) => void;
};

/**
 * The theme is chosen in the window, which main cannot read: the window says which scheme the
 * system parts (scrollbars, title bar, menus) are drawn in. A source that is not one of the
 * three is refused, so nothing but a scheme reaches the system.
 */
export function registerAppearanceHandlers(
    ipc: HandlerIpc,
    deps: AppearanceHandlerDeps,
): () => void {
    ipc.handle(CHANNELS.appearanceConfigure, (_event, raw) => {
        const request = checkedRequest(appearanceConfigureRequestSchema, raw);

        if (!request.ok) {
            return Promise.resolve(request);
        }

        deps.setSource(request.value.source);

        return Promise.resolve(success({}));
    });

    return () => {
        ipc.removeHandler(CHANNELS.appearanceConfigure);
    };
}
