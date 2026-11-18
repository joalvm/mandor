import { CHANNELS, type NoticeCode, type NoticeParam, type NoticePush } from '@mandor/ipc';

import { pushToWindow, type PushTarget } from '../ipc/push-to-window.js';

/** More than this and the oldest are forgotten: a window that never listens must not grow main. */
const KEPT = 50;

/**
 * What a module of main raises to tell the person something nobody asked for. The window
 * translates the code, so main never holds a sentence; `key` folds repeats of one cause into a
 * single toast.
 */
export type NoticeOutbox = {
    raise: (
        code: NoticeCode,
        tone: NoticePush['tone'],
        params?: Record<string, NoticeParam>,
        key?: string,
    ) => void;
    /** What was raised and is still kept, oldest first, for a window that listened late. */
    list: () => NoticePush[];
};

/**
 * The outbox of one window: it pushes each notice as it is raised and keeps the last ones, so
 * the notices that were born before the window mounted its listener are still told. One per
 * window, because the ids count what that window has been sent.
 */
export function createNoticeOutbox(target: PushTarget): NoticeOutbox {
    const kept: NoticePush[] = [];
    let counter = 0;

    return {
        raise: (code, tone, params, key) => {
            counter += 1;

            const notice: NoticePush = {
                id: counter,
                code,
                tone,
                ...(params === undefined ? {} : { params }),
                ...(key === undefined ? {} : { key }),
            };

            kept.push(notice);

            if (kept.length > KEPT) {
                kept.shift();
            }

            pushToWindow(target, CHANNELS.noticeRaised, notice);
        },
        list: () => [...kept],
    };
}
