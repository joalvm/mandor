import { describe, expect, it } from 'vitest';

import { entitiesOfPaths } from '../../src/repo/entities-of-paths.js';

describe('the entities the paths of a repo belong to', () => {
    it('names each entity once, however many of its files changed', () => {
        const entities = entitiesOfPaths([
            'workspaces/pagos/environments/prod.yaml',
            'workspaces/pagos/environments/prod.yaml',
            'mandor.yaml',
        ]);

        expect(entities).toEqual([
            { area: 'environment', workspaceId: 'pagos', id: 'prod' },
            { area: 'repo' },
        ]);
    });

    it('leaves out a path that is no part of the shape of a repo', () => {
        expect(entitiesOfPaths(['notes.txt', '.gitignore'])).toEqual([]);
    });
});
