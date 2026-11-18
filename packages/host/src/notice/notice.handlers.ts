import { CHANNELS, success } from '@mandor/ipc';
import { z } from 'zod';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import type { NoticeOutbox } from './raise-notice.js';

const NO_REQUEST = z.object({}).strict();

/**
 * The channel a window uses to catch up on the notices main raised before it listened. The
 * rest travels the other way, as a push from the outbox.
 */
export function registerNoticeHandlers(ipc: HandlerIpc, outbox: NoticeOutbox): () => void {
    ipc.handle(CHANNELS.noticeList, (_event, raw) => {
        const request = checkedRequest(NO_REQUEST, raw ?? {});

        return Promise.resolve(request.ok ? success(outbox.list()) : request);
    });

    return () => {
        ipc.removeHandler(CHANNELS.noticeList);
    };
}
