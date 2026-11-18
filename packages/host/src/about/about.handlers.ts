import {
    appAboutRequestSchema,
    appOpenLicensesRequestSchema,
    CHANNELS,
    failure,
    success,
    type AppAbout,
} from '@mandor/ipc';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';

export type AboutHandlerDeps = {
    /** Who the app is, read from the process each time it is asked. */
    about: () => AppAbout;
    /** Shows the licenses of the install; answers why it could not, or an empty string. */
    showLicenses: () => Promise<string>;
};

/**
 * The two questions the About section asks main: who the app is, and to show its licenses.
 * Neither takes anything, so a window that sends a payload is refused rather than believed.
 */
export function registerAboutHandlers(ipc: HandlerIpc, deps: AboutHandlerDeps): () => void {
    ipc.handle(CHANNELS.appAbout, (_event, raw) => {
        const request = checkedRequest(appAboutRequestSchema, raw ?? {});

        return Promise.resolve(request.ok ? success(deps.about()) : request);
    });

    ipc.handle(CHANNELS.appOpenLicenses, async (_event, raw) => {
        const request = checkedRequest(appOpenLicensesRequestSchema, raw ?? {});

        if (!request.ok) {
            return request;
        }

        const reason = await deps.showLicenses();

        return reason === '' ? success({}) : failure('unknown', reason);
    });

    return () => {
        ipc.removeHandler(CHANNELS.appAbout);
        ipc.removeHandler(CHANNELS.appOpenLicenses);
    };
}
