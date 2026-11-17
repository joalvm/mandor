import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { formBodyOf } from '../../src/import/form-body-of.js';

describe('the form body a set of rows makes', () => {
    it('keeps the fields that survived and every degradation, in the order of the rows', () => {
        const mapping = formBodyOf([
            {
                field: { key: 'a', value: '1', enabled: true, kind: 'text' },
                degradations: [degradation('pkceAlways')],
            },
            { degradations: [degradation('fileBodyWithoutFile')] },
            {
                field: { key: 'f', value: 'a.png', enabled: false, kind: 'file' },
                degradations: [],
            },
        ]);

        expect(mapping).toEqual({
            body: {
                type: 'form',
                fields: [
                    { key: 'a', value: '1', enabled: true, kind: 'text' },
                    { key: 'f', value: 'a.png', enabled: false, kind: 'file' },
                ],
            },
            degradations: [degradation('pkceAlways'), degradation('fileBodyWithoutFile')],
        });
    });

    it('makes an empty form of no rows', () => {
        expect(formBodyOf([])).toEqual({ body: { type: 'form', fields: [] }, degradations: [] });
    });
});
