import { describe, expect, it } from 'vitest';

import { menuEditPushSchema } from '../../src/menu/menu-edit.js';

describe('menu:edit payload', () => {
    it('accepts the two steps of the history the menu offers', () => {
        expect(menuEditPushSchema.parse({ step: 'undo' })).toEqual({ step: 'undo' });
        expect(menuEditPushSchema.parse({ step: 'redo' })).toEqual({ step: 'redo' });
    });

    it('rejects a step the menu never shows', () => {
        expect(menuEditPushSchema.safeParse({ step: 'paste' }).success).toBe(false);
    });

    it('rejects a payload that carries anything but the step', () => {
        expect(menuEditPushSchema.safeParse({ step: 'undo', times: 2 }).success).toBe(false);
    });
});
