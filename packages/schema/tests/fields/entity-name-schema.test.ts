import { describe, expect, it } from 'vitest';

import { entityNameSchema } from '../../src/fields/entity-name-schema.js';

describe('entityNameSchema', () => {
    it.each(['Pagos', 'API de pagos (v2)', 'Éxito', '  with margin  ', '日本語'])(
        'accepts the name %j as the user typed it',
        (name) => {
            expect(entityNameSchema.parse(name)).toBe(name);
        },
    );

    it.each(['', ' ', '\t\n  '])('refuses %j, which the UI could not render', (name) => {
        expect(entityNameSchema.safeParse(name).success).toBe(false);
    });

    it('refuses what is not text', () => {
        expect(entityNameSchema.safeParse(undefined).success).toBe(false);
    });
});
