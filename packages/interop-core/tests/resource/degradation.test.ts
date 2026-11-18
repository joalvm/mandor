import { describe, expect, it } from 'vitest';

import { degradation, degradationSchema } from '../../src/resource/degradation.js';

describe('a degradation', () => {
    it('is a code and the values its phrase needs, never the phrase', () => {
        expect(degradation('circularSchema', { name: 'Pedido' })).toEqual({
            code: 'circularSchema',
            values: { name: 'Pedido' },
        });
    });

    it('carries no values when its phrase needs none', () => {
        expect(degradation('pkceAlways')).toEqual({ code: 'pkceAlways', values: {} });
    });
});

describe('the schema of a degradation', () => {
    it('reads back what was written', () => {
        const written = degradation('harEntriesCombined', { count: '2' });

        expect(degradationSchema.parse(written)).toEqual(written);
    });

    it.each([
        ['a code nobody declares', { code: 'nope', values: {} }],
        ['a phrase in place of a loss', 'the timings are not imported'],
        ['a value that is not text', { code: 'pkceAlways', values: { count: 2 } }],
        ['a field more', { code: 'pkceAlways', values: {}, text: 'x' }],
    ])('refuses %s', (_label, value) => {
        expect(degradationSchema.safeParse(value).success).toBe(false);
    });
});
