import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { scriptsOf } from '../../../src/postman/import/scripts-of.js';

describe('scriptsOf', () => {
    const script = (event: 'onBeforeRequest' | 'onResponse', enabled: boolean) => ({
        event,
        dialect: 'postman' as const,
        source: 'a()',
        enabled,
    });

    it('keeps the scripts that are on as text, and says they do not run', () => {
        expect(scriptsOf([script('onBeforeRequest', true), script('onResponse', true)])).toEqual({
            importedScripts: [
                { event: 'onBeforeRequest', dialect: 'postman', source: 'a()' },
                { event: 'onResponse', dialect: 'postman', source: 'a()' },
            ],
            degradations: [
                degradation('scriptAsText', { kind: 'pre-request' }),
                degradation('scriptAsText', { kind: 'test' }),
            ],
        });
    });

    it('leaves out a script Postman switched off, and says so', () => {
        expect(scriptsOf([script('onResponse', false)])).toEqual({
            importedScripts: [],
            degradations: [degradation('scriptDisabled', { kind: 'test' })],
        });
        expect(scriptsOf(undefined)).toEqual({ importedScripts: [], degradations: [] });
    });
});
