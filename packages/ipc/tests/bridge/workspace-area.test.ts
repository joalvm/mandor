import { describe, expect, it } from 'vitest';

import type { WorkspaceArea } from '../../src/bridge/workspace-area.js';

describe('the workspace area of the bridge', () => {
    it('offers exactly the verbs the workspaces page and its variables act on', () => {
        const verbs = {
            create: 1,
            delete: 1,
            list: 1,
            rename: 1,
        } satisfies Record<keyof WorkspaceArea, number>;

        expect(Object.keys(verbs)).toHaveLength(4);
    });
});
