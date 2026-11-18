import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createNoticeOutbox } from '../../src/notice/raise-notice.js';
import { spyWindow } from '../../src/testing/handler-harness.js';

describe('the outbox of a window', () => {
    it('pushes each notice with a code and the next id', () => {
        const window = spyWindow();
        const outbox = createNoticeOutbox(window);

        outbox.raise('files-unreadable', 'warning', { count: 2 }, 'files-unreadable');
        outbox.raise('files-unreadable', 'error');

        expect(window.sent).toEqual([
            [
                CHANNELS.noticeRaised,
                {
                    id: 1,
                    code: 'files-unreadable',
                    tone: 'warning',
                    params: { count: 2 },
                    key: 'files-unreadable',
                },
            ],
            [CHANNELS.noticeRaised, { id: 2, code: 'files-unreadable', tone: 'error' }],
        ]);
    });

    it('keeps what it raised for a window that listens late, oldest first', () => {
        const outbox = createNoticeOutbox(spyWindow());

        outbox.raise('files-unreadable', 'warning');
        outbox.raise('files-unreadable', 'error');

        expect(outbox.list().map((notice) => notice.id)).toEqual([1, 2]);
    });

    it('forgets the oldest past fifty, and keeps counting', () => {
        const outbox = createNoticeOutbox(spyWindow());

        for (let raised = 0; raised < 52; raised += 1) {
            outbox.raise('files-unreadable', 'warning');
        }

        const ids = outbox.list().map((notice) => notice.id);

        expect(ids).toHaveLength(50);
        expect(ids[0]).toBe(3);
        expect(ids.at(-1)).toBe(52);
    });

    it('does not hand out its own list to be changed', () => {
        const outbox = createNoticeOutbox(spyWindow());

        outbox.raise('files-unreadable', 'warning');
        outbox.list().pop();

        expect(outbox.list()).toHaveLength(1);
    });

    it('says nothing to a window that is gone, and still keeps the notice', () => {
        const window = spyWindow();
        const outbox = createNoticeOutbox(window);

        window.destroy();
        outbox.raise('files-unreadable', 'warning');

        expect(window.sent).toEqual([]);
        expect(outbox.list()).toHaveLength(1);
    });
});
