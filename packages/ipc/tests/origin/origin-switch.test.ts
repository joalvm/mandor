import { describe, expect, it } from 'vitest';

import {
    originSwitchRequestSchema,
    originSwitchResultSchema,
} from '../../src/origin/origin-switch.js';

describe('originSwitchRequestSchema', () => {
    it('chooses an origin by its id alone', () => {
        expect(originSwitchRequestSchema.parse({ id: 'local' })).toEqual({ id: 'local' });
    });

    it('refuses anything else the renderer adds, such as where the origin lives', () => {
        expect(originSwitchRequestSchema.safeParse({ id: 'local', root: '/x' }).success).toBe(
            false,
        );
    });

    it('refuses an id that is not one id segment', () => {
        expect(originSwitchRequestSchema.safeParse({ id: '../local' }).success).toBe(false);
    });
});

describe('originSwitchResultSchema', () => {
    it('answers with the repo and the workspaces of the origin it opened', () => {
        const opened = {
            repo: { formatVersion: 1, name: 'Personal', workspaces: ['pagos'] },
            workspaces: [
                { id: 'pagos', kind: 'sync', name: 'Pagos', modifiedAt: '2026-11-17T10:00:00Z' },
            ],
        };

        expect(originSwitchResultSchema.parse({ ok: true, value: opened })).toEqual({
            ok: true,
            value: opened,
        });
    });

    it('answers an origin with no repo yet', () => {
        const opened = { repo: null, workspaces: [] };

        expect(originSwitchResultSchema.parse({ ok: true, value: opened }).ok).toBe(true);
    });

    it('answers an origin it could not reach with its code', () => {
        const failure = { ok: false, error: { code: 'origin-unreachable', message: 'offline' } };

        expect(originSwitchResultSchema.parse(failure)).toEqual(failure);
    });
});
