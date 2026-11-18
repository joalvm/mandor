import { describe, expect, it } from 'vitest';

import { securityNamesOf, securitySchemesOf } from '../../../src/asyncapi/import/map-security.js';
import type { InteropSecurityScheme } from '@mandor/interop-core';

const schemes: Record<string, InteropSecurityScheme> = {
    token: { type: 'http', extras: { scheme: 'bearer' } },
};

describe('securitySchemesOf', () => {
    it('reads the named schemes the document declares, type first', () => {
        const raw = {
            components: { securitySchemes: { token: { type: 'http', scheme: 'bearer' } } },
        };

        expect(securitySchemesOf(raw)).toEqual({
            token: { type: 'http', extras: { scheme: 'bearer' } },
        });
    });

    it('answers nothing when the document declares no schemes', () => {
        expect(securitySchemesOf({})).toEqual({});
    });

    it('skips a scheme that is not an object or says no type', () => {
        const raw = {
            components: { securitySchemes: { plano: 'http', mudo: { scheme: 'bearer' } } },
        };

        expect(securitySchemesOf(raw)).toEqual({});
    });
});

describe('securityNamesOf', () => {
    it('reads 2.x requirements, which name the scheme they ask for', () => {
        expect(securityNamesOf([{ token: [] }, { other: ['lea'] }], schemes)).toEqual([
            'token',
            'other',
        ]);
    });

    it('reads 3.x requirements, which carry the scheme inline, by matching it to the registry', () => {
        const requirements = [{ type: 'http', scheme: 'bearer' }];

        expect(securityNamesOf(requirements, schemes)).toEqual(['token']);
    });

    it('names an inline scheme nobody declared, instead of dropping it', () => {
        const requirements = [{ type: 'oauth2', flows: {} }];

        expect(securityNamesOf(requirements, schemes)).toEqual(['anon-1']);
    });

    it('names a requirement that is not an object, instead of dropping it', () => {
        expect(securityNamesOf([null, 'token'], schemes)).toEqual(['anon-1', 'anon-2']);
    });

    it('answers nothing when security is absent', () => {
        expect(securityNamesOf(undefined, schemes)).toEqual([]);
    });
});
