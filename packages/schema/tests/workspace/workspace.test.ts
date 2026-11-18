import { describe, expect, it } from 'vitest';

import type { Workspace } from '../../src/index.js';

describe('Workspace', () => {
    it('is a plain data shape', () => {
        const workspace: Workspace = { id: 'api-pagos', kind: 'sync', name: 'Api Pagos' };

        expect(workspace.kind).toBe('sync');
    });

    it('types the workspace kind as a closed union', () => {
        const kinds: Workspace['kind'][] = ['async', 'sync'];

        expect(kinds).toHaveLength(2);
    });
});
