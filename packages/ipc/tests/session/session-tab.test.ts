import { describe, expect, it } from 'vitest';

import { sessionTabSchema } from '../../src/session/session-tab.js';

const TAB = {
    id: 'overview',
    kind: 'doc',
    resource: 'mandor://demo/payments/doc/overview.md',
} as const;

describe('a tab of the session', () => {
    it('keeps the mark of a tab opened only to look at it', () => {
        expect(sessionTabSchema.parse({ ...TAB, preview: true })).toEqual({
            ...TAB,
            preview: true,
        });
    });

    /** A session written before the mark existed reads as every tab kept. */
    it('reads a tab without the mark as kept', () => {
        expect(sessionTabSchema.parse(TAB)).toEqual(TAB);
    });

    /** Kept is the absence of the mark: two ways of saying it would be two truths to keep. */
    it('refuses a mark that says false', () => {
        expect(sessionTabSchema.safeParse({ ...TAB, preview: false }).success).toBe(false);
        expect(sessionTabSchema.safeParse({ ...TAB, pinned: false }).success).toBe(false);
    });

    it('keeps the mark of a pinned tab', () => {
        expect(sessionTabSchema.parse({ ...TAB, pinned: true })).toEqual({ ...TAB, pinned: true });
    });
});
