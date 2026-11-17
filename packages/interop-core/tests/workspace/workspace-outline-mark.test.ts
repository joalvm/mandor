import { describe, expect, it } from 'vitest';

import type { WorkspaceData } from '../../src/workspace/workspace-data.js';
import { outlineNodeSchema, workspaceOutline } from '../../src/workspace/workspace-outline.js';

const DATA = {
    name: 'Pasarela',
    connections: [],
    environments: [],
    globals: [],
    docs: [],
    collections: [
        {
            name: 'Tienda',
            settings: { variables: [], headers: [] },
            folders: [],
            items: [
                { kind: 'request', name: 'cobrar', tags: [], body: { method: 'POST' } },
                { kind: 'request', name: 'sin método', tags: [], body: {} },
                { kind: 'message', name: 'avisar', tags: [], body: { method: 'POST' } },
            ],
        },
    ],
} as WorkspaceData;

describe('the mark of an outline node', () => {
    it('is the method of a request, and no other node wears one', () => {
        const [collection] = workspaceOutline(DATA, {});

        expect(collection?.mark).toBeUndefined();
        expect(collection?.children.map((node) => node.mark)).toEqual([
            'POST',
            undefined,
            undefined,
        ]);
    });

    it('is a shape the border accepts', () => {
        const [collection] = workspaceOutline(DATA, {});

        expect(outlineNodeSchema.safeParse(collection?.children[0]).success).toBe(true);
    });
});
