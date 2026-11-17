import { describe, expect, it } from 'vitest';

import { resolveTemplates, type VariableScope } from '../../src/index.js';

const scope: VariableScope = [
    { name: 'environment', values: { host: 'env.example.com', token: 't-1' } },
];

describe('resolveTemplates', () => {
    it('resolves every template of the object and returns each value under its key', () => {
        const result = resolveTemplates(
            { url: 'wss://{{host}}/socket', 'headers.Authorization': 'Bearer {{token}}' },
            scope,
        );

        expect(result.values).toEqual({
            url: 'wss://env.example.com/socket',
            'headers.Authorization': 'Bearer t-1',
        });
    });

    /** The URL and the headers of a connection arrive together; each entry names its field. */
    it('reports one missing entry per field when the same name is missing in two of them', () => {
        const result = resolveTemplates(
            { url: 'wss://{{host}}/socket', headers: 'Bearer {{host}}' },
            [],
        );

        expect(result.missing).toEqual([
            { name: 'host', positions: [6], field: 'url' },
            { name: 'host', positions: [7], field: 'headers' },
        ]);
    });

    it('fuses the used names of every field, once per name', () => {
        const result = resolveTemplates({ url: '{{host}}', ping: '{{host}} {{token}}' }, scope);

        expect(result.used).toEqual([
            { name: 'host', level: 'environment', secret: false },
            { name: 'token', level: 'environment', secret: false },
        ]);
    });

    it('returns empty reports for an object without templates', () => {
        const result = resolveTemplates({}, scope);

        expect(result).toEqual({ values: {}, used: [], missing: [] });
    });

    /** Undefined is not empty, field by field either. */
    it('keeps an undefined placeholder in the resolved value of its field', () => {
        const result = resolveTemplates({ url: 'wss://{{host}}/socket' }, []);

        expect(result.values['url']).toBe('wss://{{host}}/socket');
    });
});
