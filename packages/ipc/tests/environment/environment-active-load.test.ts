import { describe, expect, it } from 'vitest';

import {
    activeEnvironmentsSchema,
    environmentActiveLoadRequestSchema,
    environmentActiveLoadResultSchema,
} from '../../src/environment/environment-active-load.js';

describe('environmentActiveLoadRequestSchema', () => {
    it('carries nothing: main knows which origin is open', () => {
        expect(environmentActiveLoadRequestSchema.parse({})).toEqual({});
    });

    it('refuses anything the renderer adds to it', () => {
        expect(environmentActiveLoadRequestSchema.safeParse({ workspaceId: 'a' }).success).toBe(
            false,
        );
    });
});

describe('activeEnvironmentsSchema', () => {
    it('maps each workspace to the environment chosen for it', () => {
        const active = { 'api-pagos': 'prod', eventos: 'local' };

        expect(activeEnvironmentsSchema.parse(active)).toEqual(active);
    });

    it('refuses a key or a value that is not an id', () => {
        expect(activeEnvironmentsSchema.safeParse({ 'Api Pagos': 'prod' }).success).toBe(false);
        expect(activeEnvironmentsSchema.safeParse({ 'api-pagos': '../prod' }).success).toBe(false);
    });
});

describe('environmentActiveLoadResultSchema', () => {
    it('answers with the map of the active environments', () => {
        const answer = { ok: true, value: { 'api-pagos': 'prod' } };

        expect(environmentActiveLoadResultSchema.parse(answer)).toEqual(answer);
    });

    it('answers a failure with a code', () => {
        const failure = { ok: false, error: { code: 'fs-read', message: 'gone' } };

        expect(environmentActiveLoadResultSchema.parse(failure)).toEqual(failure);
    });
});
