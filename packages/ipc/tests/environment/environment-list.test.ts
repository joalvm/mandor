import { describe, expect, it } from 'vitest';

import {
    environmentListRequestSchema,
    environmentListResultSchema,
} from '../../src/environment/environment-list.js';

const LOCAL = {
    id: 'local',
    name: 'Local',
    variables: [{ name: 'host', value: 'localhost', enabled: true, secret: false }],
};

describe('environmentListRequestSchema', () => {
    it('asks for the environments of one workspace', () => {
        expect(environmentListRequestSchema.parse({ workspaceId: 'api-pagos' })).toEqual({
            workspaceId: 'api-pagos',
        });
    });

    it('refuses a workspace that is not an id', () => {
        expect(environmentListRequestSchema.safeParse({ workspaceId: '../x' }).success).toBe(false);
    });
});

describe('environmentListResultSchema', () => {
    it('answers with every environment and its variables', () => {
        const answer = { ok: true, value: [LOCAL] };

        expect(environmentListResultSchema.parse(answer)).toEqual(answer);
    });

    it('refuses a variable that is missing its flags', () => {
        const stray = { ...LOCAL, variables: [{ name: 'host', value: 'localhost' }] };

        expect(environmentListResultSchema.safeParse({ ok: true, value: [stray] }).success).toBe(
            false,
        );
    });

    it('answers a failure with a code', () => {
        const failure = { ok: false, error: { code: 'fs-read', message: 'gone' } };

        expect(environmentListResultSchema.parse(failure)).toEqual(failure);
    });
});
