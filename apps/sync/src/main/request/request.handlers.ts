import { activeRepo, type ChooseSavePath, type HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    failure,
    requestBodyReadRequestSchema,
    requestBodySaveRequestSchema,
    requestCancelRequestSchema,
    success,
    type Channel,
} from '@mandor/ipc';

import { hideAnswer } from './hidden-answer.js';
import { readBodyWindow } from './read-body-window.js';
import type { SendScripts } from './request-scripts.js';
import { responsesInFlight } from './responses-in-flight.js';
import { runSend, type Inflight, type SendDeps } from './run-send.js';
import { saveBody } from './save-body.js';

/**
 * A send of the person runs its scripts: their workers and the values they set come with it. The
 * scripts of an answer still running are counted here, one count for the sends of this window.
 */
export type RequestHandlerDeps = SendDeps &
    Omit<SendScripts, 'inFlight'> & {
        /** Where the user picks to save a body; the dialog of the system in the app. */
        chooseSavePath: ChooseSavePath;
    };

const CHANNEL_LIST: Channel[] = [
    CHANNELS.requestSend,
    CHANNELS.requestCancel,
    CHANNELS.requestBodyRead,
    CHANNELS.requestBodySave,
    CHANNELS.requestHideSecrets,
];

/**
 * The five channels of a request: send it, cut it, read a window of its body, save it and hide
 * the secrets of its answer.
 * The disposer aborts what is still in flight, so a closed window leaves no socket dialing. A
 * switch of origin cuts nothing: the send ends in the history of the origin it left from, and
 * the window, already looking at another one, lets its answer go.
 */
export function registerRequestHandlers(ipc: HandlerIpc, deps: RequestHandlerDeps): () => void {
    const inflight: Inflight = new Map();
    const sends = { ...deps, inFlight: responsesInFlight() };

    ipc.handle(CHANNELS.requestSend, (_event, raw) => runSend(sends, inflight, raw));
    ipc.handle(CHANNELS.requestCancel, (_event, raw) => {
        const input = requestCancelRequestSchema.safeParse(raw);

        if (!input.success) {
            return Promise.resolve(failure('bad-request', input.error.message));
        }

        inflight.get(input.data.sendId)?.abort();

        return Promise.resolve(success({}));
    });
    ipc.handle(CHANNELS.requestBodyRead, (_event, raw) => {
        const input = requestBodyReadRequestSchema.safeParse(raw);
        const repo = activeRepo();

        if (!input.success) {
            return Promise.resolve(failure('bad-request', input.error.message));
        }

        return repo.ok ? readBodyWindow(repo.value.root, input.data) : Promise.resolve(repo);
    });
    ipc.handle(CHANNELS.requestBodySave, (_event, raw) => {
        const input = requestBodySaveRequestSchema.safeParse(raw);
        const repo = activeRepo();

        if (!input.success) {
            return Promise.resolve(failure('bad-request', input.error.message));
        }

        return repo.ok
            ? saveBody(repo.value.root, deps.chooseSavePath, input.data)
            : Promise.resolve(repo);
    });

    ipc.handle(CHANNELS.requestHideSecrets, (_event, raw) => Promise.resolve(hideAnswer(raw)));

    return () => {
        for (const controller of inflight.values()) {
            controller.abort();
        }

        inflight.clear();
        CHANNEL_LIST.forEach((channel) => {
            ipc.removeHandler(channel);
        });
    };
}
