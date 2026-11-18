import type { InteropResponseExample } from '@mandor/interop-core';
import type { RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { examplesOf } from '../../../src/postman/import/examples-of.js';

const PARENT: RequestItem = {
    name: 'Pide',
    method: 'GET',
    url: 'https://x',
    query: [{ key: 'a', value: '1', enabled: true }],
    headers: [],
    pathParams: [],
    body: { type: 'none' },
    examples: [],
    settings: {},
    description: 'nota',
    auth: { type: 'bearer', token: '{{t}}' },
    importedScripts: [],
};

const ANSWER: InteropResponseExample = { name: 'ok', status: '200', contentType: '', body: '' };

const SAME = [{ name: 'a', in: 'query', required: false, enabled: true, value: '1' }] as const;

describe('examplesOf', () => {
    it('leaves as it is an example with no request', () => {
        expect(examplesOf([ANSWER], PARENT)).toEqual({ examples: [ANSWER], degradations: [] });
    });

    it('keeps nothing of a request that changes nothing of the parent', () => {
        const { examples } = examplesOf(
            [{ ...ANSWER, sentWith: { parameters: [...SAME] } }],
            PARENT,
        );

        expect(examples).toEqual([ANSWER]);
    });

    it('keeps only what the request changes', () => {
        const { examples } = examplesOf(
            [
                {
                    ...ANSWER,
                    sentWith: {
                        parameters: [
                            { name: 'a', in: 'query', required: false, enabled: true, value: '2' },
                        ],
                        auth: { type: 'none' },
                        description: 'otra',
                    },
                },
            ],
            PARENT,
        );

        expect(examples[0]?.request).toEqual({
            query: [{ key: 'a', value: '2', enabled: true }],
            auth: { type: 'none' },
            description: 'otra',
        });
    });

    it('says what its body lost', () => {
        const { degradations, examples } = examplesOf(
            [
                {
                    ...ANSWER,
                    sentWith: {
                        parameters: [...SAME],
                        requestBody: { contentType: 'raro/x', value: 'b', required: false },
                    },
                },
            ],
            PARENT,
        );

        expect(degradations).toHaveLength(1);
        expect(examples[0]?.request).toBeUndefined();
    });
});
