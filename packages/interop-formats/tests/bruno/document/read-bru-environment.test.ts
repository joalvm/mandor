import { describe, expect, it } from 'vitest';

import { environmentOfBru } from '../../../src/bruno/document/read-bru-environment.js';

describe('environmentOfBru', () => {
    it('is called as its file is and lists its variables with their flags', () => {
        const text =
            'vars {\n  baseUrl: https://api.test\n  ~debug: 1\n}\n\nvars:secret [\n  token\n]\n';

        expect(environmentOfBru({ path: 'environments/Prod.bru', text })).toEqual({
            name: 'Prod',
            variables: [
                { name: 'baseUrl', value: 'https://api.test', disabled: false, secret: false },
                { name: 'debug', value: '1', disabled: true, secret: false },
                { name: 'token', value: '', disabled: false, secret: true },
            ],
        });
    });

    it('has no variable for a file that holds none', () => {
        expect(environmentOfBru({ path: 'Vacío.bru', text: '' })).toEqual({
            name: 'Vacío',
            variables: [],
        });
    });

    it('says which file is wrong', () => {
        expect(() => environmentOfBru({ path: 'environments/E.bru', text: 'vars {\n  a' })).toThrow(
            'environments/E.bru: Line 2, col 4:',
        );
    });
});
