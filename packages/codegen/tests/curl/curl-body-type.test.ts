import { describe, expect, it } from 'vitest';

import { typedBody } from '../../src/curl/curl-body-type.js';

const JSON_HEADERS = [
    ['Content-Type', 'application/json'],
    ['Accept', 'application/json'],
];

describe('the type of the body a curl sends', () => {
    it('makes json of what --json sent, and asks for the headers --json adds', () => {
        expect(typedBody({ text: '{"a":1}', json: true, contentType: '' })).toEqual({
            body: { type: 'json', content: '{"a":1}' },
            headers: JSON_HEADERS,
        });
    });

    it.each(['application/json', 'Application/JSON; charset=utf-8', 'application/ld+json'])(
        'makes json of a body sent as %s',
        (contentType) => {
            expect(typedBody({ text: '{}', json: false, contentType })).toEqual({
                body: { type: 'json', content: '{}' },
                headers: [],
            });
        },
    );

    it.each(['application/xml', 'text/xml', 'application/atom+xml'])(
        'makes xml of a body sent as %s',
        (contentType) => {
            expect(typedBody({ text: '<a/>', json: false, contentType }).body).toEqual({
                type: 'xml',
                content: '<a/>',
            });
        },
    );

    it.each(['', 'application/x-www-form-urlencoded'])(
        'makes fields of a body that looks like a form, with %j as type',
        (contentType) => {
            expect(typedBody({ text: 'a=1&b=x%20y&c=', json: false, contentType })).toEqual({
                body: {
                    type: 'urlencoded',
                    fields: [
                        { key: 'a', value: '1', enabled: true },
                        { key: 'b', value: 'x y', enabled: true },
                        { key: 'c', value: '', enabled: true },
                    ],
                },
                headers: [],
            });
        },
    );

    it.each(['{"a":1}', '[1]', ' <a/>', 'plain', 'a=1&b', 'a=1\nb=2', ''])(
        'does not read %j as a form',
        (text) => {
            expect(typedBody({ text, json: false, contentType: '' }).body.type).toBe('text');
        },
    );

    it('says the type curl sends when the body is text and nobody wrote one', () => {
        expect(typedBody({ text: 'hello', json: false, contentType: '' })).toEqual({
            body: { type: 'text', content: 'hello' },
            headers: [['Content-Type', 'application/x-www-form-urlencoded']],
        });
    });

    it('keeps as text a body of any other type, form-like or not', () => {
        expect(typedBody({ text: 'a=1', json: false, contentType: 'text/plain' })).toEqual({
            body: { type: 'text', content: 'a=1' },
            headers: [],
        });
    });
});
