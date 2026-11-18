import { describe, expect, it } from 'vitest';

import { examplesOfBru } from '../../../src/bruno/document/read-bru-example.js';

describe('the examples of a .bru file', () => {
    it('reads the response and the request it answered, as the parser gives them', () => {
        const { examples, unread } = examplesOfBru([
            {
                name: 'Ok',
                description: 'Hola',
                request: {
                    url: 'http://x/a',
                    method: 'get',
                    body: { mode: 'json', json: '{"a":1}' },
                    params: [
                        { name: 'q', value: '1', enabled: true, type: 'query' },
                        { name: 'id', value: '7', enabled: true, type: 'path' },
                    ],
                    headers: [{ name: 'a', value: 'b', enabled: false }],
                },
                response: {
                    status: '201',
                    statusText: 'Created',
                    headers: [{ name: 'content-type', value: 'text/plain', enabled: true }],
                    body: { type: 'text', content: 'hola' },
                },
            },
        ]);

        expect(unread).toBe(false);
        expect(examples[0]).toMatchObject({
            name: 'Ok',
            description: 'Hola',
            status: '201',
            bodyType: 'text',
            body: 'hola',
            headers: [{ name: 'content-type', value: 'text/plain', disabled: false }],
            request: {
                url: 'http://x/a',
                headers: [{ name: 'a', value: 'b', disabled: true }],
                params: [{ name: 'q', value: '1', disabled: false }],
                pathParams: [{ name: 'id', value: '7', disabled: false }],
                body: { type: 'json' },
            },
        });
    });

    it('takes a request with no url as one to no address', () => {
        expect(examplesOfBru([{ request: {} }]).examples[0]?.request?.url).toBe('');
    });

    it('takes an example with nothing in it as an empty one', () => {
        expect(examplesOfBru([{}]).examples).toEqual([
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

    it('says when one cannot be read, and has none when there is none', () => {
        expect(examplesOfBru([{ name: 3 }])).toEqual({ examples: [], unread: true });
        expect(examplesOfBru(undefined)).toEqual({ examples: [], unread: false });
    });
});
