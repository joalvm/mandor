import { describe, expect, it } from 'vitest';

import { RESOURCE_PLACES } from '../../src/resource/resource-place.js';
import { INTEROP_SCOPES } from '../../src/scope/interop-scope.js';
import { resourcesInScope } from '../../src/scope/resources-in-scope.js';

const EVERY_PLACE = RESOURCE_PLACES.map((place) => ({ place }));

describe('the resources an import or an export covers (resourcesInScope)', () => {
    it('names the two scopes there are', () => {
        expect(INTEROP_SCOPES).toEqual(['collection', 'workspace']);
    });

    it('keeps the collection, its folders and its items when the scope is a collection', () => {
        expect(resourcesInScope(EVERY_PLACE, 'collection').map(({ place }) => place)).toEqual([
            'collection',
            'folder',
            'item',
        ]);
    });

    it('leaves out what lives above a collection: connections, environments, notes and the workspace file', () => {
        const left = resourcesInScope(EVERY_PLACE, 'collection').map(({ place }) => place);

        expect(left).not.toContain('connection');
        expect(left).not.toContain('environment');
        expect(left).not.toContain('doc');
        expect(left).not.toContain('workspace');
    });

    it('keeps every place when the scope is the workspace', () => {
        expect(resourcesInScope(EVERY_PLACE, 'workspace')).toEqual(EVERY_PLACE);
    });

    it('keeps what else a resource carries and the order it came in', () => {
        const resources = [
            { place: 'item', route: 'a/b' },
            { place: 'environment', route: 'prod' },
            { place: 'collection', route: 'a' },
        ] as const;

        expect(resourcesInScope(resources, 'collection')).toEqual([resources[0], resources[2]]);
    });
});
