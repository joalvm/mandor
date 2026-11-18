import { describe, expect, it } from 'vitest';

import { initialWorkspaceSlice } from '../src/workspace.slice.js';

describe('the workspace the window works in', () => {
    it('is born with none open', () => {
        expect(initialWorkspaceSlice()).toEqual({ activeWorkspaceId: null });
    });

    it('hands out a new object each time, so no window shares its state with another', () => {
        expect(initialWorkspaceSlice()).not.toBe(initialWorkspaceSlice());
    });
});
