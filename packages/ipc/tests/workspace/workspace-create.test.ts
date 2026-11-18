import { describe, expect, it } from 'vitest';

import {
    workspaceCreateRequestSchema,
    workspaceCreateResultSchema,
} from '../../src/workspace/workspace-create.js';

describe('workspaceCreateRequestSchema', () => {
    it('takes the name the user typed', () => {
        expect(workspaceCreateRequestSchema.parse({ name: 'API de pagos' })).toEqual({
            name: 'API de pagos',
        });
    });

    it('refuses a name made of whitespace only', () => {
        expect(workspaceCreateRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
    });

    it('does not carry the kind: main stamps it from the app it hosts', () => {
        const parsed = workspaceCreateRequestSchema.parse({ name: 'Pagos', kind: 'sync' });

        expect(parsed).toEqual({ name: 'Pagos' });
    });
});

describe('workspaceCreateResultSchema', () => {
    it('answers with the workspace as main wrote it, id and kind included', () => {
        const workspace = { id: 'pagos', kind: 'sync', name: 'Pagos' };

        expect(workspaceCreateResultSchema.parse({ ok: true, value: workspace })).toEqual({
            ok: true,
            value: workspace,
        });
    });

    it('refuses a workspace of a kind that does not exist', () => {
        const workspace = { id: 'pagos', kind: 'batch', name: 'Pagos' };

        expect(workspaceCreateResultSchema.safeParse({ ok: true, value: workspace }).success).toBe(
            false,
        );
    });

    it('answers a name that is already taken with its code', () => {
        const failure = { ok: false, error: { code: 'name-taken', message: 'taken' } };

        expect(workspaceCreateResultSchema.parse(failure)).toEqual(failure);
    });
});
