import { describe, expect, it } from 'vitest';

import { workspaceSchema } from '../../src/workspace/workspace-schema.js';

const WORKSPACE = { id: 'pagos', kind: 'sync', name: 'Pagos' };

describe('workspaceSchema', () => {
    it('reads a workspace with only what it must have', () => {
        expect(workspaceSchema.parse(WORKSPACE)).toEqual(WORKSPACE);
    });

    it('reads the auth, the default environment and the origin of an import', () => {
        const full = {
            ...WORKSPACE,
            auth: { type: 'bearer', token: '{{token}}' },
            defaultEnvironment: 'local',
            importOrigin: { kind: 'postman', sourceId: 'abc' },
        };

        expect(workspaceSchema.parse(full)).toEqual(full);
    });

    it('reads the scripts an import brought and Mandor only keeps', () => {
        const withScripts = {
            ...WORKSPACE,
            importedScripts: [
                {
                    event: 'onBeforeRequest',
                    dialect: 'postman',
                    source: 'pm.environment.set("a", 1)',
                },
            ],
        };

        expect(workspaceSchema.safeParse(withScripts).success).toBe(true);
    });

    it('refuses an id that is not one id segment', () => {
        expect(workspaceSchema.safeParse({ ...WORKSPACE, id: 'Pagos 1' }).success).toBe(false);
    });

    it('refuses a name made of whitespace only', () => {
        expect(workspaceSchema.safeParse({ ...WORKSPACE, name: ' ' }).success).toBe(false);
    });

    it('refuses a default environment that is not an id', () => {
        expect(
            workspaceSchema.safeParse({ ...WORKSPACE, defaultEnvironment: '../local' }).success,
        ).toBe(false);
    });

    it('refuses a workspace with no kind: it never changes, so it is never guessed', () => {
        expect(workspaceSchema.safeParse({ id: 'pagos', name: 'Pagos' }).success).toBe(false);
    });
});
