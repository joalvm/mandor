import { describe, expect, it } from 'vitest';

import { examplesOfOpenCollection } from '../../../src/bruno/document/read-oc-example.js';

describe('the examples of an item of OpenCollection', () => {
    it('reads the response and the request it answered', () => {
        const { examples, unread } = examplesOfOpenCollection([
            {
                name: 'Creado',
                description: 'Hola',
                request: {
                    url: 'https://x/a?q=1',
                    headers: [{ name: 'a', value: 'b' }],
                    params: [
                        { name: 'q', value: '1', type: 'query' },
                        { name: 'id', value: '7', type: 'path' },
                    ],
                    body: { type: 'json', data: '{}' },
                },
                response: {
                    status: 201,
                    headers: [{ name: 'content-type', value: 'application/json' }],
                    body: { type: 'json', data: '{"ok":true}' },
                },
            },
        ]);

        expect(unread).toBe(false);
        expect(examples).toMatchObject([
            {
                name: 'Creado',
                description: 'Hola',
                status: '201',
                headers: [{ name: 'content-type', value: 'application/json', disabled: false }],
                bodyType: 'json',
                body: '{"ok":true}',
                request: {
                    url: 'https://x/a?q=1',
                    headers: [{ name: 'a', value: 'b', disabled: false }],
                    params: [{ name: 'q', value: '1', disabled: false }],
                    pathParams: [{ name: 'id', value: '7', disabled: false }],
                    body: { type: 'json', text: '{}' },
                },
            },
        ]);
    });

    it('takes a request with no url as one to no address', () => {
        expect(examplesOfOpenCollection([{ request: {} }]).examples[0]?.request?.url).toBe('');
    });

    it('takes an example with nothing in it as an empty one', () => {
        expect(examplesOfOpenCollection([{}]).examples).toEqual([
            {
                name: '',
                description: '',
                status: '',
                headers: [],
                bodyType: '',
                body: '',
                request: undefined,
            },
        ]);
    });

    it('says when what it holds cannot be read', () => {
        expect(examplesOfOpenCollection([{ name: 3 }])).toEqual({ examples: [], unread: true });
        expect(examplesOfOpenCollection('x')).toEqual({ examples: [], unread: true });
        expect(examplesOfOpenCollection(undefined)).toEqual({ examples: [], unread: false });
    });
});
