import { describe, expect, it } from 'vitest';

import { scriptsDocumentOf } from '../../../src/insomnia/export/scripts-document.js';

describe('scriptsDocumentOf', () => {
    it('writes no key when there is no script of its own', () => {
        expect(scriptsDocumentOf(undefined)).toEqual({});
        expect(scriptsDocumentOf([])).toEqual({});
        expect(
            scriptsDocumentOf([{ event: 'onResponse', dialect: 'postman', source: 'pm.test();' }]),
        ).toEqual({});
    });

    it('puts each script in its slot, as written', () => {
        expect(
            scriptsDocumentOf([
                { event: 'onBeforeRequest', dialect: 'insomnia', source: 'uno({{a}});' },
                { event: 'onResponse', dialect: 'insomnia', source: 'dos();' },
                { event: 'onResponse', dialect: 'postman', source: 'pm.test();' },
            ]),
        ).toEqual({ scripts: { preRequest: 'uno({{a}});', afterResponse: 'dos();' } });
    });
});
