import { describe, expect, it } from 'vitest';

import {
    importPlanBuildRequestSchema,
    importPlanBuiltSchema,
} from '../../src/import/import-plan-build.js';
import { CHANNELS } from '../../src/index.js';

describe('the import channels', () => {
    it('are named once and read as the wire knows them', () => {
        expect(CHANNELS.importPlanBuild).toBe('import:plan');
        expect(CHANNELS.importApply).toBe('import:apply');
    });
});

describe('the request to build a plan', () => {
    const files = [{ path: 'api.yaml', text: 'asyncapi: 3.0.0' }];

    it('carries the workspace, the files of the document and the scope, and names no format', () => {
        const request = importPlanBuildRequestSchema.safeParse({
            workspaceId: 'pasarela',
            format: 'asyncapi',
            files,
            scope: 'collection',
        });

        expect(request.success).toBe(true);
        expect(request.data).toEqual({ workspaceId: 'pasarela', files, scope: 'collection' });
    });

    it('refuses an import that does not say what it may touch, or says it wrongly', () => {
        const request = { workspaceId: 'pasarela', files };

        expect(importPlanBuildRequestSchema.safeParse(request).success).toBe(false);
        expect(importPlanBuildRequestSchema.safeParse({ ...request, scope: 'repo' }).success).toBe(
            false,
        );
    });

    it('keeps the shape of a folder in the relative paths of its files', () => {
        const nested = [...files, { path: 'environments/local.bru', text: 'vars {}' }];

        expect(
            importPlanBuildRequestSchema.safeParse({
                workspaceId: 'pasarela',
                files: nested,
                scope: 'workspace',
            }).data?.files,
        ).toEqual(nested);
    });

    it('refuses an import with no files and a file with no path', () => {
        expect(
            importPlanBuildRequestSchema.safeParse({
                workspaceId: 'pasarela',
                files: [],
                scope: 'workspace',
            }).success,
        ).toBe(false);
        expect(
            importPlanBuildRequestSchema.safeParse({
                workspaceId: 'pasarela',
                files: [{ path: '', text: 'x' }],
                scope: 'workspace',
            }).success,
        ).toBe(false);
    });

    it('refuses a workspace that is not a slug', () => {
        expect(
            importPlanBuildRequestSchema.safeParse({
                workspaceId: 'A/B',
                files,
                scope: 'workspace',
            }).success,
        ).toBe(false);
    });

    it('names no workspace when the import goes into one that does not exist yet', () => {
        const request = importPlanBuildRequestSchema.safeParse({ files, scope: 'workspace' });

        expect(request.success).toBe(true);
        expect(request.data?.workspaceId).toBeUndefined();
    });
});

describe('the result of building a plan', () => {
    it('names the document and carries the plan, and says nothing else', () => {
        const parsed = importPlanBuiltSchema.parse({
            name: 'Pasarela',
            notes: ['lo que el documento dice'],
            plan: { identity: null, entries: [] },
        });

        expect(Object.keys(parsed).toSorted()).toEqual(['name', 'plan']);
    });
});
