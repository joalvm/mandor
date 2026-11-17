import { describe, expect, it } from 'vitest';

import { responsesOf } from '../../../src/postman/import/map-responses.js';

describe('responsesOf', () => {
    it('keeps the name, the code and the body, and the type from the header whatever its case', () => {
        const [example] = responsesOf([
            {
                name: 'Found',
                code: 200,
                header: [{ key: 'x' }, { key: 'content-TYPE', value: 'application/json' }],
                body: '{}',
            },
        ]);

        expect(example).toEqual({
            name: 'Found',
            status: '200',
            contentType: 'application/json',
            body: '{}',
            headers: [
                ['x', ''],
                ['content-TYPE', 'application/json'],
            ],
        });
    });

    it.each([
        ['json', 'application/json'],
        ['xml', 'application/xml'],
        ['html', 'text/html'],
        ['text', 'text/plain'],
        ['raw', ''],
        [undefined, ''],
    ])('falls back to the preview language %s as %j', (language, contentType) => {
        const [example] = responsesOf([
            {
                code: 201,
                ...(language === undefined ? {} : { _postman_previewlanguage: language }),
            },
        ]);

        expect(example?.contentType).toBe(contentType);
    });

    it('names an example by its code when it has no name, and by a word when it has neither', () => {
        const examples = responsesOf([
            { code: 404 },
            { name: '  ', code: 500 },
            { name: null, code: null },
            {},
        ]);

        expect(examples.map(({ name, status }) => [name, status])).toEqual([
            ['404', '404'],
            ['500', '500'],
            ['response', ''],
            ['response', ''],
        ]);
    });

    it('answers none for no responses', () => {
        expect(responsesOf(undefined)).toEqual([]);
        expect(responsesOf(null)).toEqual([]);
    });

    it('keeps no headers when they only repeat the type, or have no name', () => {
        const [example] = responsesOf([
            { header: [{ key: 'Content-Type', value: 'text/plain' }, { value: 'x' }] },
        ]);

        expect(example).not.toHaveProperty('headers');
        expect(example?.contentType).toBe('text/plain');
    });

    it('keeps the cookies it answered with, a blank domain being no domain', () => {
        const [example] = responsesOf([
            {
                cookie: [
                    { name: 'a', value: '1', domain: 'x.test', path: '/', httpOnly: true },
                    { name: 'b', domain: '', path: null, secure: true },
                    { value: 'sin nombre' },
                ],
            },
        ]);

        expect(example?.cookies).toEqual([
            { name: 'a', value: '1', domain: 'x.test', path: '/', httpOnly: true, secure: false },
            { name: 'b', value: '', httpOnly: false, secure: true },
        ]);
    });

    it('keeps the request it was saved with, and none when it says none', () => {
        const [saved, none] = responsesOf([
            { originalRequest: { method: 'GET', header: [{ key: 'A', value: '1' }] } },
            { originalRequest: null },
        ]);

        expect(saved?.sentWith?.parameters.map(({ name }) => name)).toEqual(['A']);
        expect(none).not.toHaveProperty('sentWith');
    });
});
