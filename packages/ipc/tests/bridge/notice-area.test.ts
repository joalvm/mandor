import { describe, expect, it } from 'vitest';

import type { NoticeArea } from '../../src/bridge/notice-area.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the notice area of the bridge', () => {
    it('offers the list of what was raised and the push of what is raised next', () => {
        const verbs = { list: 1, onRaised: 1 } satisfies Record<keyof NoticeArea, number>;

        expect(Object.keys(verbs)).toHaveLength(2);
    });

    it('lists nothing until main raises something', async () => {
        const bridge = createFakeBridge();

        await expect(bridge.notice.list()).resolves.toEqual({ ok: true, value: [] });
    });

    it('lets the double deliver a notice and stop at the unsubscribe', () => {
        const bridge = createFakeBridge();
        const heard: unknown[] = [];
        const stop = bridge.notice.onRaised((push) => heard.push(push));
        const notice = { id: 1, code: 'files-unreadable', tone: 'warning' } as const;

        bridge.emitNotice(notice);
        stop();
        bridge.emitNotice({ ...notice, id: 2 });

        expect(heard).toEqual([notice]);
    });
});
