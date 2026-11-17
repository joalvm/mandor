import { describe, expect, it } from 'vitest';

import { createRequestItem } from '../../src/request/create-request-item.js';
import {
    EXAMPLE_OVERRIDE_KEYS,
    exampleOverrides,
    exampleRequest,
} from '../../src/request/example-request.js';
import type { RequestExample } from '../../src/request/request-example.js';
import type { RequestItem } from '../../src/request/request-item.js';

const PARENT: RequestItem = {
    ...createRequestItem({ name: 'Login' }),
    method: 'POST',
    url: '{{baseUrl}}/login',
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
};

const EXAMPLE: RequestExample = {
    name: 'OK',
    status: '200',
    contentType: 'application/json',
    body: '{}',
};

describe('the request an example sends', () => {
    it('inherits everything from the parent when the example changes nothing', () => {
        expect(exampleRequest(PARENT, EXAMPLE)).toEqual(PARENT);
    });

    it('takes the header lines the example changed over the ones of the parent', () => {
        const headers = [{ key: 'Accept', value: 'text/plain', enabled: true }];
        const request = exampleRequest(PARENT, { ...EXAMPLE, request: { headers } });

        expect(request.headers).toEqual(headers);
        expect(request.url).toBe(PARENT.url);
    });

    /** A key written as `undefined` says nothing, so it must not wipe what the parent has. */
    it('does not let an undefined override cover the parent', () => {
        const request = exampleRequest(PARENT, { ...EXAMPLE, request: { headers: undefined } });

        expect(request.headers).toEqual(PARENT.headers);
    });
});

describe('what an example keeps of its request', () => {
    it('is nothing when the edited request equals the parent', () => {
        expect(exampleOverrides(PARENT, { ...PARENT })).toBeUndefined();
    });

    it('keeps only the keys that differ', () => {
        const query = [{ key: 'page', value: '2', enabled: true }];
        const overrides = exampleOverrides(PARENT, { ...PARENT, query });

        expect(overrides).toEqual({ query });
    });

    it('keeps the query an example pins, even when it reads like the request', () => {
        const query = [{ key: 'fields', value: 'id', enabled: true }];
        const parent = { ...PARENT, query };
        const headers = [{ key: 'X', value: '1', enabled: true }];

        expect(exampleOverrides(parent, { ...parent, headers }, { query })).toEqual({
            headers,
            query,
        });
        expect(exampleOverrides(parent, { ...parent }, { headers })).toBeUndefined();
    });

    it('never keeps the name, the method or the url', () => {
        const edited = { ...PARENT, name: 'Other', method: 'GET', url: 'x' };

        expect(exampleOverrides(PARENT, edited)).toBeUndefined();
        expect(EXAMPLE_OVERRIDE_KEYS).not.toContain('name');
        expect(EXAMPLE_OVERRIDE_KEYS).not.toContain('method');
        expect(EXAMPLE_OVERRIDE_KEYS).not.toContain('url');
    });
});
