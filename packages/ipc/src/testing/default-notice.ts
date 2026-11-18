import type { NoticeArea } from '../bridge/notice-area.js';
import type { NoticePush } from '../notice/notice-push.js';
import { success } from '../result/success.js';

export type NoticeRaisedHandler = (push: NoticePush) => void;

/** The notice area a test gets when it says nothing about notices: main raised none. */
export function defaultNotice(handlers: Set<NoticeRaisedHandler>): NoticeArea {
    return {
        list: () => Promise.resolve(success([])),
        onRaised: (handler) => {
            handlers.add(handler);

            return () => handlers.delete(handler);
        },
    };
}
