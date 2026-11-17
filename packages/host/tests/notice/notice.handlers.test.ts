import { CHANNELS, noticeListResultSchema } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerNoticeHandlers } from '../../src/notice/notice.handlers.js';
import { createNoticeOutbox } from '../../src/notice/raise-notice.js';
import { spyIpc, spyWindow, type IpcSpy } from '../../src/testing/handler-harness.js';

let ipc: IpcSpy;
let dispose: () => void;
const outbox = createNoticeOutbox(spyWindow());

beforeEach(() => {
    ipc = spyIpc();
    dispose = registerNoticeHandlers(ipc, outbox);
});

afterEach(() => {
    dispose();
});

describe('the notice handlers', () => {
    it('answers with what the outbox kept, as the schema of the channel reads it', async () => {
        outbox.raise('files-unreadable', 'warning', { count: 1, names: ['Login'] });

        const answer = noticeListResultSchema.parse(await ipc.call(CHANNELS.noticeList));

        expect(answer).toEqual({ ok: true, value: outbox.list() });
        expect(outbox.list().at(-1)?.params).toEqual({ count: 1, names: ['Login'] });
    });

    it('refuses a request that carries anything', async () => {
        await expect(ipc.call(CHANNELS.noticeList, { path: '/etc' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('leaves no channel behind when it is undone', () => {
        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
