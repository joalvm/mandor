import type { RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import type { BrunoExample } from '../../../src/bruno/document/bruno-tree.js';
import { examplesOf } from '../../../src/bruno/import/examples-of.js';

const PARENT: RequestItem = {
    name: 'Pide',
    method: 'GET',
    url: 'https://x/a',
    query: [],
    headers: [],
    pathParams: [],
    body: { type: 'none' },
    examples: [],
    settings: {},
};

function example(parts: Partial<BrunoExample>): BrunoExample {
    return {
        name: 'Ok',
        description: '',
        status: '200',
        headers: [],
        bodyType: 'json',
        body: '{}',
        request: undefined,
        ...parts,
    };
}

function examplesFrom(parts: Partial<BrunoExample>) {
    return examplesOf([example(parts)], PARENT).examples;
}

describe('the examples of a request of Bruno', () => {
    it('takes the type from the kind of body when the headers do not say it', () => {
        expect(examplesFrom({})).toEqual([
            { name: 'Ok', status: '200', contentType: 'application/json', body: '{}' },
        ]);
        expect(examplesFrom({ bodyType: 'raro' })[0]?.contentType).toBe('');
    });

    it('takes the type from the headers, and keeps them only if they say more', () => {
        const type = { name: 'Content-Type', value: 'text/csv', disabled: false };
        const other = { name: 'x-a', value: '1', disabled: false };

        expect(examplesFrom({ headers: [type] })[0]).toEqual({
            name: 'Ok',
            status: '200',
            contentType: 'text/csv',
            body: '{}',
        });
        expect(examplesFrom({ headers: [type, other] })[0]?.headers).toEqual([
            ['Content-Type', 'text/csv'],
            ['x-a', '1'],
        ]);
    });

    it('names by its status one with no name, and has a status when none is said', () => {
        expect(examplesFrom({ name: '' })[0]?.name).toBe('200');
        expect(examplesFrom({ status: '' })[0]?.status).toBe('default');
    });

    it('keeps of the request what it changes, and nothing when it changes nothing', () => {
        const request = {
            url: 'https://x/a',
            headers: [],
            params: [],
            pathParams: [],
            body: undefined,
        };

        expect(examplesFrom({ request })[0]?.request).toBeUndefined();
        expect(
            examplesFrom({
                description: 'Otra',
                request: { ...request, url: 'https://x/a?q=1' },
            })[0]?.request,
        ).toEqual({
            query: [{ key: 'q', value: '1', enabled: true }],
            description: 'Otra',
        });
    });
});
