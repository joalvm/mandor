import { success, type NoticePush } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import type { ToastRequest } from '@mandor/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listenNotices } from '../../src/notice/notice-feed.js';

type Mandor = { mandor: FakeBridge };

function bridge(): FakeBridge {
    return (window as unknown as Mandor).mandor;
}

const FILES: NoticePush = {
    id: 1,
    code: 'files-unreadable',
    tone: 'warning',
    key: 'files-unreadable',
    params: { count: 2, names: ['Login', 'Pagos'] },
};

const say = vi.fn((code: string, params: Record<string, number | string>) => {
    return `${code} ${JSON.stringify(params)}`;
});

const stops: (() => void)[] = [];

function listen(told?: Set<number>): ToastRequest[] {
    const shown: ToastRequest[] = [];

    stops.push(listenNotices(say, (request) => shown.push(request), told));

    return shown;
}

/** The list main answers to a window that listens late. */
function answerList(list: NoticePush[]): void {
    bridge().notice.list = () => Promise.resolve(success(list));
}

afterEach(() => {
    for (const stop of stops.splice(0)) {
        stop();
    }

    say.mockClear();
});

describe('the feed of notices', () => {
    it('offers to start the app over beside a fault of main, and does it when chosen', () => {
        const relaunch = vi.spyOn(bridge().window, 'relaunch');
        const shown = listen();

        bridge().emitNotice({ id: 7, code: 'main-fault', tone: 'error', key: 'main-fault' });

        expect(shown[0]?.action?.label).toBe('relaunch {}');

        shown[0]?.action?.onSelect();

        expect(relaunch).toHaveBeenCalledOnce();
    });

    it('translates a notice raised after listening, joining the list of names', () => {
        const shown = listen();

        bridge().emitNotice(FILES);

        expect(shown).toEqual([
            {
                key: 'files-unreadable',
                title: 'files-unreadable {"count":2,"names":"Login, Pagos"}',
                tone: 'warning',
            },
        ]);
    });

    it('tells the notices raised before it listened', async () => {
        answerList([FILES, { id: 2, code: 'files-unreadable', tone: 'error' }]);

        const shown = listen();

        await vi.waitFor(() => {
            expect(shown.map((request) => request.tone)).toEqual(['warning', 'error']);
        });
        expect(shown[1]?.key).toBeUndefined();
    });

    it('tells a notice once when it arrives by the list and by the push', async () => {
        answerList([FILES]);

        const shown = listen();

        bridge().emitNotice(FILES);
        await vi.waitFor(() => {
            expect(say).toHaveBeenCalledOnce();
        });

        expect(shown).toHaveLength(1);
    });

    it('does not tell again what an earlier listener told', () => {
        const told = new Set<number>();
        const first = listen(told);

        bridge().emitNotice(FILES);
        stops.pop()?.();

        const second = listen(told);

        bridge().emitNotice(FILES);

        expect(first).toHaveLength(1);
        expect(second).toEqual([]);
    });

    it('goes quiet once it is let go of, even for a list that answers late', async () => {
        let answer: (() => void) | undefined;

        bridge().notice.list = () =>
            new Promise((resolve) => {
                answer = () => {
                    resolve(success([FILES]));
                };
            });

        const shown = listen();

        stops.pop()?.();
        bridge().emitNotice(FILES);
        answer?.();
        await Promise.resolve();

        expect(shown).toEqual([]);
    });

    it('survives a list the host refused', async () => {
        bridge().notice.list = () =>
            Promise.resolve({ ok: false, error: { code: 'bad-request', message: 'no' } });

        const shown = listen();

        await Promise.resolve();
        bridge().emitNotice(FILES);

        expect(shown).toHaveLength(1);
    });
});
