import { describe, expect, it } from 'vitest';

import { originEmptyRequestSchema } from '../../src/index.js';

describe('the origin:empty request', () => {
    it('names the origin by id alone', () => {
        expect(originEmptyRequestSchema.parse({ id: 'equipo' })).toEqual({ id: 'equipo' });
    });

    it('rejects an id that is not a slug and any extra key', () => {
        expect(originEmptyRequestSchema.safeParse({ id: 'Not A Slug' }).success).toBe(false);
        expect(originEmptyRequestSchema.safeParse({ id: 'equipo', sure: true }).success).toBe(
            false,
        );
    });
});
