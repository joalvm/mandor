import { describe, expect, it } from 'vitest';

import { scriptsDocumentOf } from '../../../src/insomnia/export/scripts-document.js';

describe('scriptsDocumentOf', () => {
    it('writes no key when there is no script to write', () => {
        expect(scriptsDocumentOf(undefined)).toEqual({});
        expect(scriptsDocumentOf({})).toEqual({});
        expect(scriptsDocumentOf({ onResponse: { source: '  \n' } })).toEqual({});
    });

    it('puts each script in its slot, as written', () => {
        expect(
            scriptsDocumentOf({
                onBeforeRequest: { source: 'uno({{a}});' },
                onResponse: { source: 'dos();' },
            }),
        ).toEqual({ scripts: { preRequest: 'uno({{a}});', afterResponse: 'dos();' } });
    });

    it('leaves out a script that is off: Insomnia would run it', () => {
        expect(
            scriptsDocumentOf({
                onBeforeRequest: { source: 'uno();', enabled: false },
                onResponse: { source: 'dos();' },
            }),
        ).toEqual({ scripts: { afterResponse: 'dos();' } });
    });
});
