import { describe, expect, it } from 'vitest';

import { scriptsOf } from '../../../src/postman/import/map-scripts.js';

describe('scriptsOf', () => {
    it('maps prerequest and test, joining the lines and keeping the disabled mark', () => {
        const scripts = scriptsOf([
            { listen: 'prerequest', script: { exec: ['a();', 'b();'] } },
            { listen: 'test', script: { exec: 'c();' }, disabled: true },
        ]);

        expect(scripts).toEqual([
            { event: 'onBeforeRequest', dialect: 'postman', source: 'a();\nb();', enabled: true },
            { event: 'onResponse', dialect: 'postman', source: 'c();', enabled: false },
        ]);
    });

    it('leaves out another event, a blank script, and a script that is missing', () => {
        const scripts = scriptsOf([
            { listen: 'other', script: { exec: ['x'] } },
            { listen: 'test', script: { exec: ['  ', ''] } },
            { listen: 'test', script: null },
            { listen: 'prerequest', script: { exec: null } },
            { listen: 'prerequest' },
            { listen: 'constructor', script: { exec: 'x' } },
        ]);

        expect(scripts).toEqual([]);
    });

    it('answers none for no events', () => {
        expect(scriptsOf(undefined)).toEqual([]);
        expect(scriptsOf(null)).toEqual([]);
    });
});
