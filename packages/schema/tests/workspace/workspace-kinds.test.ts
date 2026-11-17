import { describe, expect, it } from 'vitest';

import { workspaceSchema } from '../../src/workspace/workspace-schema.js';
import { WORKSPACE_KINDS } from '../../src/workspace/workspace-kinds.js';

describe('WORKSPACE_KINDS', () => {
    it('lists the two app paths, and nothing else', () => {
        expect([...WORKSPACE_KINDS]).toEqual(['async', 'sync']);
    });

    it.each(WORKSPACE_KINDS)('lets a workspace be of the kind %s', (kind) => {
        expect(workspaceSchema.safeParse({ id: 'pagos', kind, name: 'Pagos' }).success).toBe(true);
    });

    it('is the only list of kinds a workspace accepts', () => {
        expect(
            workspaceSchema.safeParse({ id: 'pagos', kind: 'hybrid', name: 'Pagos' }).success,
        ).toBe(false);
    });
});
