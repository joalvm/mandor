import {
    createRequestItem,
    requestItemSchema,
    type CurlRequest,
    type RequestItem,
} from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { applyCurl } from '../../../../src/renderer/features/requests/lib/apply-curl.js';

const BLANK = createRequestItem({ name: 'Orders' });

const CURRENT: RequestItem = {
    ...BLANK,
    description: 'What this is for',
    method: 'DELETE',
    url: 'http://old/{id}',
    pathParams: [{ key: 'id', value: '7', enabled: true }],
    bodySchema: '{"type":"object"}',
    examples: [{ name: 'ok', status: '200', contentType: 'application/json', body: '{}' }],
    scripts: { onBeforeRequest: { source: 'mandor.variables.set("a", 1)', enabled: false } },
    settings: { ...BLANK.settings, timeoutMs: 1000 },
    auth: { type: 'bearer', token: '{{token}}' },
};

const PARSED: CurlRequest = {
    method: 'POST',
    url: 'http://api.test/orders',
    query: [{ key: 'page', value: '2', enabled: true }],
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
    body: { type: 'json', content: '{"a":1}' },
    settings: { validateTls: false },
};

describe('filling a request from a pasted curl', () => {
    it('takes the method, the url, the query, the headers and the body of the command', () => {
        expect(applyCurl(CURRENT, PARSED)).toMatchObject({
            method: 'POST',
            url: 'http://api.test/orders',
            query: PARSED.query,
            headers: PARSED.headers,
            body: PARSED.body,
        });
    });

    it('drops the path values and the schema of the body it replaces', () => {
        const next = applyCurl(CURRENT, PARSED);

        expect(next.pathParams).toEqual([]);
        expect(next.bodySchema).toBeUndefined();
    });

    it('changes only the settings the command names', () => {
        expect(applyCurl(CURRENT, PARSED).settings).toEqual({
            ...CURRENT.settings,
            validateTls: false,
        });
        expect(applyCurl(CURRENT, { ...PARSED, settings: {} }).settings).toEqual(CURRENT.settings);
    });

    it('takes the auth of the command, or keeps its own when the command has none', () => {
        const auth = { type: 'basic', username: 'ana', password: '{{pass}}' } as const;

        expect(applyCurl(CURRENT, { ...PARSED, auth }).auth).toEqual(auth);
        expect(applyCurl(CURRENT, PARSED).auth).toEqual(CURRENT.auth);
    });

    it('keeps the name, the description, the examples and the scripts', () => {
        const next = applyCurl(CURRENT, PARSED);

        expect(next.name).toBe('Orders');
        expect(next.description).toBe('What this is for');
        expect(next.examples).toEqual(CURRENT.examples);
        expect(next.scripts).toEqual(CURRENT.scripts);
    });

    it('makes a request the schema accepts', () => {
        expect(requestItemSchema.safeParse(applyCurl(CURRENT, PARSED)).success).toBe(true);
    });
});
