import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { scriptsOf } from '../../../src/insomnia/import/scripts-of.js';

describe('scriptsOf', () => {
    it('says nothing of the slots nobody wrote, or left blank', () => {
        expect(scriptsOf({ preRequest: '', afterResponse: ' \n' })).toEqual({
            importedScripts: [],
            degradations: [],
        });
    });

    it('keeps each script as written, in the dialect of Insomnia, and says it does not run', () => {
        const { importedScripts, degradations } = scriptsOf({
            preRequest: 'insomnia.request.url;',
            afterResponse: 'insomnia.response.code;',
        });

        expect(importedScripts).toEqual([
            { event: 'onBeforeRequest', dialect: 'insomnia', source: 'insomnia.request.url;' },
            { event: 'onResponse', dialect: 'insomnia', source: 'insomnia.response.code;' },
        ]);
        expect(degradations[0]).toEqual(degradation('scriptAsText', { kind: 'pre-request' }));
        expect(degradations[1]).toEqual(degradation('scriptAsText', { kind: 'after-response' }));
    });
});
