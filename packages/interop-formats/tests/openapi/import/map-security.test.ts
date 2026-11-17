import { describe, expect, it } from 'vitest';

import {
    operationSecurityOf,
    securityNamesOf,
    securitySchemesOf,
} from '../../../src/openapi/import/map-security.js';

describe('the security an OpenAPI document declares', () => {
    it('keeps the type apart and the rest as written, and drops what is not a scheme', () => {
        const components = {
            securitySchemes: {
                basicAuth: { type: 'http', scheme: 'basic' },
                broken: 'text',
                typeless: { scheme: 'basic' },
            },
        };

        expect(securitySchemesOf(components)).toEqual({
            basicAuth: { type: 'http', extras: { scheme: 'basic' } },
        });
        expect(securitySchemesOf({})).toEqual({});
    });

    it('names the schemes a requirement list asks for, once each', () => {
        expect(securityNamesOf([{ a: [], b: ['scope'] }, { a: [] }, {}])).toEqual(['a', 'b']);
        expect(securityNamesOf(undefined)).toEqual([]);
        expect(securityNamesOf(['text', null])).toEqual([]);
    });

    it('tells an operation that inherits from one that asks for nothing', () => {
        expect(operationSecurityOf({})).toBeNull();
        expect(operationSecurityOf({ security: [] })).toEqual([]);
        expect(operationSecurityOf({ security: [{ apiKeyAuth: [] }] })).toEqual(['apiKeyAuth']);
    });
});
