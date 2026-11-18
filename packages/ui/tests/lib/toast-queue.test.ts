import { describe, expect, it } from 'vitest';

import {
    durationFor,
    enqueueToast,
    type ToastSpec,
    visibleToasts,
} from '../../src/lib/toast-queue.js';
import type { ToastRequest } from '../../src/index.js';

function spec(id: string): ToastSpec {
    return { count: 1, id, key: `info:${id}`, title: id, tone: 'info' };
}

function request(title: string, key?: string): ToastRequest {
    return { key, title, tone: 'error' };
}

describe('the toast queue', () => {
    /** An error is the only notice that waits for the reader instead of the clock. */
    it('leaves the error without expiry and gives every other tone one', () => {
        expect(durationFor('error')).toBe(Number.POSITIVE_INFINITY);
        expect(durationFor('warning')).toBeGreaterThan(durationFor('info'));
        expect(durationFor('success')).toBeLessThan(Number.POSITIVE_INFINITY);
    });

    it('shows the whole queue while it fits on screen', () => {
        expect(visibleToasts([spec('a'), spec('b')])).toEqual({
            hidden: 0,
            shown: [spec('a'), spec('b')],
        });
    });

    /** Past the cap the newest are kept: an old notice has already had its turn. */
    it('keeps the newest three and counts the rest', () => {
        const queue = ['a', 'b', 'c', 'd', 'e'].map(spec);

        expect(visibleToasts(queue)).toEqual({
            hidden: 2,
            shown: [spec('c'), spec('d'), spec('e')],
        });
    });

    /** Fifteen equal failures are one notice that says so, not a wall. */
    it('folds a repeated key into the toast already on screen', () => {
        const first = enqueueToast(
            [],
            { ...request('No se pudo guardar', 'save'), detail: 'a' },
            't1',
        );
        const again = enqueueToast(
            first,
            { ...request('No se pudo guardar', 'save'), detail: 'b' },
            't2',
        );

        expect(again).toHaveLength(1);
        expect(again[0]).toMatchObject({ count: 2, detail: 'b', id: 't2', key: 'save' });
    });

    it('stacks the notices whose keys differ', () => {
        const queue = enqueueToast(
            enqueueToast([], request('Uno', 'a'), 't1'),
            request('Dos', 'b'),
            't2',
        );

        expect(queue.map((toast) => toast.id)).toEqual(['t1', 't2']);
    });

    /** Without a key the tone and the title say what it is. */
    it('groups by tone and title when no key is given', () => {
        const same = enqueueToast(enqueueToast([], request('Falló'), 't1'), request('Falló'), 't2');
        const other = enqueueToast(enqueueToast([], request('Falló'), 't1'), request('Otro'), 't2');

        expect(same).toHaveLength(1);
        expect(other).toHaveLength(2);
    });

    it('keeps the place of the folded toast among the others', () => {
        const queue = ['a', 'b', 'c'].reduce<readonly ToastSpec[]>(
            (current, key) => enqueueToast(current, request(key, key), `t-${key}`),
            [],
        );
        const folded = enqueueToast(queue, request('b', 'b'), 't-new');

        expect(folded.map((toast) => toast.key)).toEqual(['a', 'b', 'c']);
        expect(folded[1]?.count).toBe(2);
    });
});
