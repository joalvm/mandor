import { afterEach, describe, expect, it } from 'vitest';

import { noticesWith, selectUnreadNotices } from '../src/notices.slice.js';
import { recordNotice } from '../src/record-notice.js';
import { shellStore } from '../src/index.js';

afterEach(() => {
    shellStore.getState().reset();
});

describe('noticesWith', () => {
    it.each(['success', 'info'] as const)('does not keep a %s: its outcome is in view', (tone) => {
        expect(noticesWith([], { title: 'Hecho', tone }, 1)).toEqual([]);
    });

    it.each(['warning', 'error'] as const)('keeps a %s, unread, with its moment', (tone) => {
        const [notice] = noticesWith([], { detail: 'Más', title: 'Falló', tone }, 42);

        expect(notice).toMatchObject({ at: 42, count: 1, detail: 'Más', read: false, tone });
    });

    it('puts the newest on top', () => {
        const rows = noticesWith(
            noticesWith([], { title: 'Uno', tone: 'error' }, 1),
            { title: 'Dos', tone: 'error' },
            2,
        );

        expect(rows.map((row) => row.title)).toEqual(['Dos', 'Uno']);
    });

    /** A row that happens again is the same row: counted, fresh and back on top, never a twin. */
    it('folds a repeated key into one row that comes back unread to the top', () => {
        const first = noticesWith([], { key: 'save', title: 'Guardar', tone: 'error' }, 1);
        const other = noticesWith(first, { title: 'Otro', tone: 'warning' }, 2);
        const again = noticesWith(
            other.map((row) => ({ ...row, read: true })),
            { detail: 'ahora', key: 'save', title: 'Guardar', tone: 'error' },
            3,
        );

        expect(again.map((row) => row.title)).toEqual(['Guardar', 'Otro']);
        expect(again[0]).toMatchObject({ at: 3, count: 2, detail: 'ahora', read: false });
        expect(again[0]?.id).toBe(first[0]?.id);
    });

    it('groups by tone and title when there is no key', () => {
        const rows = [1, 2, 3].reduce<ReturnType<typeof noticesWith>>(
            (current, at) => noticesWith(current, { title: 'Falló', tone: 'error' }, at),
            [],
        );

        expect(rows).toHaveLength(1);
        expect(rows[0]?.count).toBe(3);
    });

    it('lets go of the oldest past a hundred rows', () => {
        const rows = Array.from({ length: 101 }, (_, index) => index).reduce<
            ReturnType<typeof noticesWith>
        >(
            (current, index) =>
                noticesWith(current, { title: `n${String(index)}`, tone: 'error' }, index),
            [],
        );

        expect(rows).toHaveLength(100);
        expect(rows[0]?.title).toBe('n100');
        expect(rows.at(-1)?.title).toBe('n1');
    });
});

describe('the notices of the window', () => {
    it('records through the exported function and counts what is unread', () => {
        recordNotice({ title: 'Falló', tone: 'error' });
        recordNotice({ title: 'Cuidado', tone: 'warning' });

        expect(selectUnreadNotices(shellStore.getState())).toBe(2);

        shellStore.getState().markNoticesRead();

        expect(selectUnreadNotices(shellStore.getState())).toBe(0);
        expect(shellStore.getState().notices).toHaveLength(2);
    });

    it('dismisses one row and clears them all', () => {
        recordNotice({ title: 'Uno', tone: 'error' });
        recordNotice({ title: 'Dos', tone: 'error' });

        const [newest] = shellStore.getState().notices;

        shellStore.getState().dismissNotice(newest?.id ?? '');

        expect(shellStore.getState().notices.map((row) => row.title)).toEqual(['Uno']);

        shellStore.getState().clearNotices();

        expect(shellStore.getState().notices).toEqual([]);
    });

    it('starts a window with the centre closed and empty', () => {
        expect(shellStore.getState()).toMatchObject({ notices: [], noticesOpen: false });
    });
});
