import { describe, expect, it } from 'vitest';

import { changedEntitySchema } from '../../src/repo/changed-entity.js';

describe('changedEntitySchema', () => {
    it.each([
        { area: 'repo' },
        { area: 'workspace', workspaceId: 'pagos' },
        { area: 'collections', workspaceId: 'pagos', path: 'pedidos/crear' },
        { area: 'collections', workspaceId: 'pagos', path: '' },
        { area: 'doc', workspaceId: 'pagos', name: 'Notas de la API.md' },
        { area: 'environment', workspaceId: 'pagos', id: 'local' },
        { area: 'connection', workspaceId: 'pagos', id: 'chat' },
    ])('reads %j', (entity) => {
        expect(changedEntitySchema.parse(entity)).toEqual(entity);
    });

    it('refuses an area it does not know', () => {
        expect(changedEntitySchema.safeParse({ area: 'cache' }).success).toBe(false);
    });

    it('refuses a workspace that is not an id segment', () => {
        const entity = { area: 'workspace', workspaceId: '../pagos' };

        expect(changedEntitySchema.safeParse(entity).success).toBe(false);
    });

    it('refuses a key that does not belong to the area', () => {
        const entity = { area: 'repo', workspaceId: 'pagos' };

        expect(changedEntitySchema.safeParse(entity).success).toBe(false);
    });
});
