import { describe, expect, it } from 'vitest';

import { scriptsOf } from '../../../src/insomnia/import/scripts-of.js';

describe('scriptsOf', () => {
    it('gives nothing for the slots nobody wrote, or left blank', () => {
        expect(scriptsOf({ preRequest: '', afterResponse: ' \n' })).toBeUndefined();
    });

    it('puts each script in the own script of its moment, as written', () => {
        expect(
            scriptsOf({
                preRequest: 'insomnia.request.url;',
                afterResponse: 'insomnia.response.code;',
            }),
        ).toEqual({
            onBeforeRequest: { source: 'insomnia.request.url;' },
            onResponse: { source: 'insomnia.response.code;' },
        });
    });
});
