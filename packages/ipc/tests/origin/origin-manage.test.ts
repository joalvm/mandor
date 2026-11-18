import { describe, expect, it } from 'vitest';

import {
    originCheckRequestSchema,
    originCheckResultSchema,
} from '../../src/origin/origin-check.js';
import { originRemoveRequestSchema } from '../../src/origin/origin-remove.js';
import { originRenameRequestSchema } from '../../src/origin/origin-rename.js';

describe('the origin:rename request', () => {
    it('accepts an id and a name', () => {
        expect(
            originRenameRequestSchema.parse({ id: 'github-equipo-api', name: 'Equipo' }),
        ).toEqual({ id: 'github-equipo-api', name: 'Equipo' });
    });

    it('rejects an empty name and an id that is not a slug', () => {
        expect(originRenameRequestSchema.safeParse({ id: 'equipo', name: '  ' }).success).toBe(
            false,
        );
        expect(originRenameRequestSchema.safeParse({ id: 'a/b', name: 'Equipo' }).success).toBe(
            false,
        );
    });
});

describe('the origin:remove request', () => {
    it('takes an id alone', () => {
        expect(originRemoveRequestSchema.parse({ id: 'equipo' })).toEqual({ id: 'equipo' });
    });

    it('rejects keys the channel does not know', () => {
        expect(originRemoveRequestSchema.safeParse({ id: 'equipo', alsoEmpty: true }).success).toBe(
            false,
        );
    });
});

describe('the origin:check contract', () => {
    it('takes an id alone', () => {
        expect(originCheckRequestSchema.parse({ id: 'equipo' })).toEqual({ id: 'equipo' });
    });

    it('answers with an id and whether the origin answered', () => {
        expect(
            originCheckResultSchema.parse({ ok: true, value: { id: 'equipo', reachable: true } }),
        ).toEqual({ ok: true, value: { id: 'equipo', reachable: true } });
        expect(
            originCheckResultSchema.safeParse({
                ok: true,
                value: { id: 'equipo', reachable: false },
            }).success,
        ).toBe(true);
    });

    it('rejects an answer without the reachability', () => {
        expect(
            originCheckResultSchema.safeParse({ ok: true, value: { id: 'equipo' } }).success,
        ).toBe(false);
    });
});
