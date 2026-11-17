import { describe, expect, it } from 'vitest';

import { RESOURCE_PLACES } from '../../src/resource/resource-place.js';

describe('the place a resource lands', () => {
    it('offers the places a workspace holds, and nothing else', () => {
        expect(RESOURCE_PLACES).toEqual([
            'collection',
            'connection',
            'doc',
            'environment',
            'folder',
            'globals',
            'item',
            'workspace',
        ]);
    });
});
