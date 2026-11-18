import { describe, expect, it } from 'vitest';

import { exampleRequestOf } from '../../../src/postman/import/example-request-of.js';

describe('exampleRequestOf', () => {
    it('reads the parameters, the body and the description of the request', () => {
        const request = exampleRequestOf({
            url: { raw: 'x?a=1', query: [{ key: 'a', value: '1' }] },
            header: [{ key: 'H', value: '2' }],
            body: { mode: 'raw', raw: '{}', options: { raw: { language: 'json' } } },
            description: 'nota',
        });

        expect(request.parameters.map(({ name, in: place }) => [name, place])).toEqual([
            ['a', 'query'],
            ['H', 'header'],
        ]);
        expect(request.requestBody).toMatchObject({ value: '{}' });
        expect(request.description).toBe('nota');
        expect(request.auth).toBeUndefined();
    });

    it('reads what the auth asks for: its own, or none', () => {
        const bearer = { type: 'bearer', bearer: [{ key: 'token', value: '{{t}}' }] };

        expect(exampleRequestOf({ auth: bearer }).auth).toEqual({
            type: 'bearer',
            token: '{{t}}',
        });
        expect(exampleRequestOf({ auth: { type: 'noauth' } }).auth).toEqual({ type: 'none' });
    });
});
