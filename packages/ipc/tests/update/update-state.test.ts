import { describe, expect, it } from 'vitest';

import { updateStateResultSchema, updateStateSchema } from '../../src/update/update-state.js';

const IDLE = { phase: 'idle', support: 'full', current: '0.1.0' } as const;

describe('the state of the updates', () => {
    it('needs only the phase, the support and the version that runs', () => {
        expect(updateStateSchema.parse(IDLE)).toEqual(IDLE);
    });

    it('carries the version waiting, the progress and the failure when there are any', () => {
        const state = {
            ...IDLE,
            phase: 'downloading',
            next: { version: '0.2.0', notes: '# Novedades', date: '2026-10-01T10:00:00.000Z' },
            progress: 42,
        };

        expect(updateStateSchema.parse(state)).toEqual(state);
        expect(
            updateStateSchema.parse({ ...IDLE, phase: 'error', error: 'unknown' }),
        ).toMatchObject({ error: 'unknown' });
    });

    it.each([
        ['a phase it has no word for', { ...IDLE, phase: 'installing' }],
        ['a support it has no word for', { ...IDLE, support: 'partial' }],
        ['a progress that is not a whole percent', { ...IDLE, progress: 41.5 }],
        ['a progress past one hundred', { ...IDLE, progress: 101 }],
        ['notes past the cap', { ...IDLE, next: { version: '1', notes: 'x'.repeat(65537) } }],
        ['a field it does not know', { ...IDLE, path: '/tmp' }],
    ])('refuses %s', (_name, state) => {
        expect(updateStateSchema.safeParse(state).success).toBe(false);
    });

    it('reads the answer of the channel as a result', () => {
        expect(updateStateResultSchema.parse({ ok: true, value: IDLE })).toEqual({
            ok: true,
            value: IDLE,
        });
    });
});
