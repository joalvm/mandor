import type { UpdateNext, UpdateState } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import {
    initialUpdateState,
    nextUpdateState,
    releaseNotesOf,
} from '../../src/update/update-machine.js';
import type { UpdatePortEvent } from '../../src/update/update-port.js';

const NEXT: UpdateNext = { version: '0.2.0', notes: '# Novedades', date: '2026-10-01' };

const START = initialUpdateState('0.1.0', 'full');

function after(state: UpdateState, ...events: UpdatePortEvent[]): UpdateState {
    return events.reduce(nextUpdateState, state);
}

describe('the state after each event of the updater', () => {
    it('starts as an install that has not looked for anything', () => {
        expect(START).toEqual({ phase: 'idle', support: 'full', current: '0.1.0' });
    });

    it('goes from looking to finding to downloading to ready', () => {
        const checking = after(START, { type: 'checking-for-update' });
        const found = after(checking, { type: 'update-available', info: NEXT });
        const halfway = after(found, { type: 'download-progress', percent: 41.6 });
        const ready = after(halfway, { type: 'update-downloaded', info: NEXT });

        expect(checking.phase).toBe('checking');
        expect(found).toMatchObject({ phase: 'available', next: NEXT });
        expect(halfway).toMatchObject({ phase: 'downloading', next: NEXT, progress: 42 });
        expect(ready).toEqual({ ...START, phase: 'ready', next: NEXT });
    });

    it('keeps the progress inside a whole percent', () => {
        const low = after(START, { type: 'download-progress', percent: -3 });
        const high = after(START, { type: 'download-progress', percent: 140 });

        expect([low.progress, high.progress]).toEqual([0, 100]);
    });

    it('goes back to idle when a look finds nothing', () => {
        const found = after(START, { type: 'update-available', info: NEXT });

        expect(after(found, { type: 'update-not-available' })).toEqual(START);
    });

    it('names the failure, and keeps the version it was after', () => {
        const found = after(START, { type: 'update-available', info: NEXT });

        expect(after(found, { type: 'error', code: 'request-unreachable' })).toMatchObject({
            phase: 'error',
            error: 'request-unreachable',
            next: NEXT,
        });
    });

    it('clears the failure the next time it looks', () => {
        const failed = after(START, { type: 'error', code: 'unknown' });

        expect(after(failed, { type: 'checking-for-update' }).error).toBeUndefined();
    });

    it('does not let a later look take away a version that is ready', () => {
        const ready = after(START, { type: 'update-downloaded', info: NEXT });

        expect(
            after(
                ready,
                { type: 'checking-for-update' },
                { type: 'update-not-available' },
                { type: 'error', code: 'unknown' },
                { type: 'download-progress', percent: 10 },
            ),
        ).toEqual(ready);
    });

    it('does not let a look interrupt a download that is running', () => {
        const downloading = after(START, { type: 'download-progress', percent: 10 });

        expect(
            after(downloading, { type: 'checking-for-update' }, { type: 'update-not-available' }),
        ).toEqual(downloading);
    });
});

describe('the release notes of a feed', () => {
    it('keeps a text as it is', () => {
        expect(releaseNotesOf('## Cambios\n\n- uno')).toBe('## Cambios\n\n- uno');
    });

    it('joins the notes of a list under the version each one belongs to', () => {
        expect(
            releaseNotesOf([
                { version: '0.2.0', note: 'Nuevo' },
                { version: '0.1.1', note: 'Arreglo' },
                { note: 'Sin versión' },
                'ignored',
                null,
            ]),
        ).toBe('## 0.2.0\n\nNuevo\n\n## 0.1.1\n\nArreglo\n\nSin versión');
    });

    it('reads a note with no text as an empty one', () => {
        expect(releaseNotesOf([{ version: 7, note: 9 }, { version: '1.0.0' }])).toBe(
            '\n\n## 1.0.0\n\n',
        );
    });

    it.each([[null], [undefined], [''], ['   '], [42], [[]]])('is no notes for %j', (raw) => {
        expect(releaseNotesOf(raw)).toBeUndefined();
    });

    it('cuts what goes past the cap of the state', () => {
        expect(releaseNotesOf('x'.repeat(70_000))).toHaveLength(64 * 1024);
    });
});
