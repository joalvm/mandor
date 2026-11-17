import {
    CHANNELS,
    failure,
    success,
    type Channel,
    type Empty,
    type Result,
    type UpdateState,
    updateConfigureRequestSchema,
} from '@mandor/ipc';
import { z } from 'zod';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { pushToWindow, type PushTarget } from '../ipc/push-to-window.js';
import type { Logger } from '../log/create-logger.js';
import type { NoticeOutbox } from '../notice/raise-notice.js';
import type { UpdateMenu } from '../menu/update-menu.js';
import { createUpdateActions } from './update-actions.js';
import { initialUpdateState, nextUpdateState } from './update-machine.js';
import type { UpdatePort, UpdatePortEvent } from './update-port.js';
import type { UpdateSchedule } from './update-schedule.js';

const NO_REQUEST = z.object({}).strict();

const EMPTY: Result<Empty> = success({});

/** The events a look that was asked for is still going through; any other one ends it. */
const STILL_ASKING: ReadonlySet<UpdatePortEvent['type']> = new Set<UpdatePortEvent['type']>([
    'checking-for-update',
    'download-progress',
]);

const UPDATE_CHANNELS: readonly Channel[] = [
    CHANNELS.updateState,
    CHANNELS.updateConfigure,
    CHANNELS.updateCheck,
    CHANNELS.updateDownload,
    CHANNELS.updateInstall,
    CHANNELS.updateOpenPage,
];

export type UpdateHandlerDeps = {
    port: UpdatePort;
    support: UpdateState['support'];
    outbox: NoticeOutbox;
    target: PushTarget;
    logger: Logger;
    /** The page of the app where a version can be taken. Fixed by the app, never by the window. */
    homepage: string;
    openExternal: (url: string) => Promise<void>;
    /** Waits for what is written to reach the disk, which the install must not outrun. */
    settle: () => Promise<void>;
    /** The looks main makes by itself, which the choice of the person drives. */
    schedule: UpdateSchedule;
    /** Hands the application menu what the updates say, each time it changes. */
    announce: (menu: UpdateMenu) => void;
};

/**
 * The updates, served to the window: the state main keeps, the three things the person asks for
 * and the push of every change. The window sends nothing that names a file or an address.
 *
 * A look that failed by itself is only logged, because being offline is normal; one the person
 * asked for is told, because they are waiting for an answer.
 */
export function registerUpdateHandlers(ipc: HandlerIpc, deps: UpdateHandlerDeps): () => void {
    const { port, support, outbox, target, logger } = deps;
    let state = initialUpdateState(port.currentVersion, support);
    let asked = false;
    const actions = createUpdateActions({
        ...deps,
        state: () => state,
        ask: () => {
            asked = true;
        },
    });
    const tellMenu = () => {
        deps.announce({ state, run: (action) => void actions[action]() });
    };

    const stopListening = port.onEvent((event) => {
        state = nextUpdateState(state, event);
        pushToWindow(target, CHANNELS.updateChanged, state);
        tellMenu();

        if (event.type === 'error') {
            logger.log('info', `updates: failed with ${event.code}`);

            if (asked) {
                outbox.raise('update-failed', 'error');
            }
        }

        if (!STILL_ASKING.has(event.type)) {
            asked = false;
        }
    });

    const serve = (channel: Channel, run: () => Promise<Result<unknown>> | Result<unknown>) => {
        ipc.handle(channel, async (_event, raw) => {
            const request = checkedRequest(NO_REQUEST, raw ?? {});

            return request.ok ? await run() : request;
        });
    };

    tellMenu();
    serve(CHANNELS.updateState, () => success(state));
    ipc.handle(CHANNELS.updateConfigure, (_event, raw) => {
        const request = updateConfigureRequestSchema.safeParse(raw);

        if (!request.success) {
            return Promise.resolve(failure('bad-request', request.error.message));
        }

        deps.schedule.configure(request.data);

        return Promise.resolve(EMPTY);
    });
    serve(CHANNELS.updateCheck, actions.check);
    serve(CHANNELS.updateDownload, actions.download);
    serve(CHANNELS.updateInstall, actions.install);
    serve(CHANNELS.updateOpenPage, actions.openPage);

    return () => {
        stopListening();
        deps.schedule.dispose();

        for (const channel of UPDATE_CHANNELS) {
            ipc.removeHandler(channel);
        }
    };
}
