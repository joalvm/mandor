import { describe, expect, it } from 'vitest';

import { listedWorkspaceSchema } from '../../src/workspace/workspace-list.js';
import { workspaceDeleteRequestSchema } from '../../src/workspace/workspace-delete.js';
import { workspaceRenameRequestSchema } from '../../src/workspace/workspace-rename.js';

describe('the workspace:rename request', () => {
    it('accepts an id and a name', () => {
        expect(workspaceRenameRequestSchema.parse({ id: 'pedidos', name: 'Pedidos' })).toEqual({
            id: 'pedidos',
            name: 'Pedidos',
        });
    });

    it('rejects a name the domain would refuse', () => {
        expect(workspaceRenameRequestSchema.safeParse({ id: 'pedidos', name: '  ' }).success).toBe(
            false,
        );
    });
});

describe('the workspace:delete request', () => {
    it('takes an id alone', () => {
        expect(workspaceDeleteRequestSchema.parse({ id: 'pedidos' })).toEqual({ id: 'pedidos' });
    });

    it('rejects keys the channel does not know', () => {
        expect(workspaceDeleteRequestSchema.safeParse({ id: 'pedidos', force: true }).success).toBe(
            false,
        );
    });
});

describe('the workspace:list entry', () => {
    it('is a workspace plus when it was last touched', () => {
        expect(
            listedWorkspaceSchema.parse({
                id: 'pedidos',
                kind: 'async',
                name: 'Pedidos',
                modifiedAt: '2026-09-20T10:00:00.000Z',
            }),
        ).toEqual({
            id: 'pedidos',
            kind: 'async',
            name: 'Pedidos',
            modifiedAt: '2026-09-20T10:00:00.000Z',
        });
    });

    it('carries no date when nothing touched the workspace yet', () => {
        expect(
            listedWorkspaceSchema.parse({
                id: 'pedidos',
                kind: 'async',
                name: 'Pedidos',
                modifiedAt: null,
            }).modifiedAt,
        ).toBeNull();
    });

    it('rejects an entry without the date', () => {
        expect(
            listedWorkspaceSchema.safeParse({
                id: 'pedidos',
                kind: 'async',
                name: 'Pedidos',
            }).success,
        ).toBe(false);
    });
});
