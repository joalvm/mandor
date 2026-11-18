import { describe, expect, it } from 'vitest';

import { originAddRequestSchema } from '../../src/index.js';

describe('the origin:add request', () => {
    it('accepts a name and a url', () => {
        const parsed = originAddRequestSchema.parse({
            name: 'Equipo',
            url: 'https://github.com/equipo/api.git',
        });

        expect(parsed).toEqual({ name: 'Equipo', url: 'https://github.com/equipo/api.git' });
    });

    it('rejects an empty name and an empty url', () => {
        expect(
            originAddRequestSchema.safeParse({ name: '  ', url: 'https://github.com/e/a.git' })
                .success,
        ).toBe(false);
        expect(originAddRequestSchema.safeParse({ name: 'Equipo', url: '' }).success).toBe(false);
    });

    it('rejects keys the channel does not know', () => {
        expect(
            originAddRequestSchema.safeParse({
                name: 'Equipo',
                url: 'https://github.com/e/a.git',
                root: 'C:/repos/demo',
            }).success,
        ).toBe(false);
    });
});
