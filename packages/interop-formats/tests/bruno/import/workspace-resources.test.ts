import { describe, expect, it } from 'vitest';

import { workspaceResourcesOf } from '../../../src/bruno/import/workspace-resources.js';
import { documentNode } from '../support/trees.js';

describe('workspaceResourcesOf: the auth of a collection', () => {
    it('writes nothing when no collection has an environment', () => {
        expect(workspaceResourcesOf([documentNode()])).toEqual([]);
        expect(workspaceResourcesOf([])).toEqual([]);
    });

    it('does not make the auth of any collection the one of the workspace', () => {
        const resources = workspaceResourcesOf([
            documentNode({ auth: { type: 'bearer', token: '{{a}}' } }),
            documentNode({ sourceId: 'collection:b', auth: { type: 'basic' } }),
        ]);

        expect(resources).toEqual([]);
    });
});
