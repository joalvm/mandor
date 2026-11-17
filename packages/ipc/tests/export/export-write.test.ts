import { describe, expect, it } from 'vitest';

import { exportWriteRequestSchema, exportWriteResultSchema } from '../../src/index.js';

describe('the contract of writing an export', () => {
    it('takes the workspace, the format, the scope and the leaves left marked', () => {
        const request = {
            workspaceId: 'pasarela',
            format: 'asyncapi',
            scope: 'workspace',
            chosen: ['connection/produccion', 'collection/0/item/1'],
        };

        expect(exportWriteRequestSchema.parse(request)).toEqual(request);
    });

    it('refuses a request without the choice, with nothing chosen, or with a blank route', () => {
        const base = { workspaceId: 'pasarela', format: 'asyncapi', scope: 'workspace' };

        expect(exportWriteRequestSchema.safeParse(base).success).toBe(false);
        expect(exportWriteRequestSchema.safeParse({ ...base, chosen: [] }).success).toBe(false);
        expect(exportWriteRequestSchema.safeParse({ ...base, chosen: [''] }).success).toBe(false);
    });

    it('never takes a path: the user picks it in the dialog of the system', () => {
        const request = {
            workspaceId: 'pasarela',
            format: 'asyncapi',
            scope: 'workspace',
            chosen: ['a'],
        };

        expect(exportWriteRequestSchema.safeParse({ ...request, path: '/tmp/a' }).success).toBe(
            false,
        );
    });

    it('writes one collection when the scope names it, and refuses the scopes that disagree', () => {
        const base = { workspaceId: 'pasarela', format: 'openapi', chosen: ['collection/0'] };

        expect(
            exportWriteRequestSchema.safeParse({
                ...base,
                scope: 'collection',
                collection: 'tienda',
            }).success,
        ).toBe(true);
        expect(exportWriteRequestSchema.safeParse({ ...base, scope: 'collection' }).success).toBe(
            false,
        );
        expect(
            exportWriteRequestSchema.safeParse({
                ...base,
                scope: 'workspace',
                collection: 'tienda',
            }).success,
        ).toBe(false);
    });

    it('answers with the path, or with none when the dialog was closed', () => {
        expect(exportWriteResultSchema.parse({ ok: true, value: { path: null } })).toEqual({
            ok: true,
            value: { path: null },
        });
        expect(
            exportWriteResultSchema.safeParse({ ok: true, value: { path: '/tmp/a.yaml' } }).success,
        ).toBe(true);
    });
});
