import { describe, expect, it } from 'vitest';

import { importApplyRequestSchema, importAppliedSchema } from '../../src/import/import-apply.js';

describe('the request to apply a plan', () => {
    const plan = {
        identity: { kind: 'asyncapi', sourceId: 'abc' },
        entries: [
            {
                class: 'add',
                place: 'connection',
                route: 'produccion',
                name: 'Produccion',
                selected: true,
                resource: {
                    place: 'connection',
                    itemKind: null,
                    route: 'produccion',
                    name: 'Produccion',
                    fields: { url: 'wss://pasarela.example/v1' },
                    origin: { kind: 'asyncapi', sourceId: 'abc' },
                    degradations: [],
                },
            },
        ],
    };

    it('carries the workspace, the name of the document and the plan the user accepted', () => {
        const request = importApplyRequestSchema.safeParse({
            target: { workspaceId: 'pasarela' },
            name: 'Pasarela',
            plan,
        });

        expect(request.success).toBe(true);
    });

    it('can ask for a new workspace instead, named after the document', () => {
        const request = importApplyRequestSchema.safeParse({
            target: { newWorkspace: 'Pasarela' },
            name: 'Pasarela',
            plan,
        });

        expect(request.data?.target).toEqual({ newWorkspace: 'Pasarela' });
    });

    it('refuses a target that names both, none, or a workspace that is not a slug', () => {
        const base = { name: 'Pasarela', plan };

        for (const target of [
            { workspaceId: 'pasarela', newWorkspace: 'Pasarela' },
            {},
            { workspaceId: 'A/B' },
            { newWorkspace: '   ' },
        ]) {
            expect(importApplyRequestSchema.safeParse({ ...base, target }).success).toBe(false);
        }
    });

    it('refuses a plan whose identity and entries disagree', () => {
        const request = importApplyRequestSchema.safeParse({
            target: { workspaceId: 'pasarela' },
            name: 'Pasarela',
            plan: { identity: null, entries: plan.entries },
        });

        expect(request.success).toBe(false);
    });

    it('refuses a document with no name', () => {
        const request = importApplyRequestSchema.safeParse({
            target: { workspaceId: 'pasarela' },
            name: '   ',
            plan,
        });

        expect(request.success).toBe(false);
    });
});

describe('what an apply no longer takes', () => {
    it('writes no report, so it asks for no language and no notes', () => {
        const parsed = importApplyRequestSchema.parse({
            target: { workspaceId: 'pasarela' },
            name: 'Pasarela',
            plan: { identity: null, entries: [] },
            language: 'es',
            notes: ['uno'],
        });

        expect(Object.keys(parsed).toSorted()).toEqual(['name', 'plan', 'target']);
    });
});

describe('the result of an apply', () => {
    it('counts the resources that were written and names the workspace that got them', () => {
        expect(importAppliedSchema.parse({ applied: 5, workspaceId: 'pasarela' })).toEqual({
            applied: 5,
            workspaceId: 'pasarela',
        });
    });

    it('refuses a count that is not a whole number of resources', () => {
        const workspaceId = 'pasarela';

        expect(importAppliedSchema.safeParse({ applied: -1, workspaceId }).success).toBe(false);
        expect(importAppliedSchema.safeParse({ applied: 1.5, workspaceId }).success).toBe(false);
        expect(importAppliedSchema.safeParse({ applied: '2', workspaceId }).success).toBe(false);
    });
});
