import { describe, expect, it } from 'vitest';

import { bodyContentType } from '../../src/request/body-content-type.js';

describe('bodyContentType', () => {
    it.each([
        ['json', 'application/json'],
        ['graphql', 'application/json'],
        ['xml', 'application/xml'],
        ['text', 'text/plain; charset=utf-8'],
        ['urlencoded', 'application/x-www-form-urlencoded'],
        ['form', 'multipart/form-data'],
        ['none', null],
        ['binary', null],
    ] as const)('says %s implies %s', (type, contentType) => {
        expect(bodyContentType({ type })).toBe(contentType);
    });
});
