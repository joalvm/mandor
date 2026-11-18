import type { NoticePush } from '../notice/notice-push.js';
import type { Result } from '../result/result.js';

/**
 * What main has to say that is nobody's request: a file it could not read, a failure of the
 * background. The window asks for what was raised before it listened, and hears the rest.
 */
export type NoticeArea = {
    /** Every notice the window has not outlived, oldest first, so a late listener misses none. */
    list: () => Promise<Result<NoticePush[]>>;
    /** A notice was raised in main. Whoever shows notices translates the code. */
    onRaised: (handler: (push: NoticePush) => void) => () => void;
};
