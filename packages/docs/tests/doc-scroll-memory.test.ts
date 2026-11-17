import { describe, expect, it } from 'vitest';

import { forgetDocTop, rememberDocTop, rememberedDocTop } from '../src/lib/doc-scroll-memory.js';

describe('where each tab had its page', () => {
    it('opens at the top for a tab nobody has scrolled', () => {
        expect(rememberedDocTop('doc-never-touched')).toBe(0);
    });

    /** Crossing to the markdown and back is what this is for: the place has to survive it. */
    it('hands back the place of the tab that was asked for, and of no other', () => {
        rememberDocTop('doc-1', 420);
        rememberDocTop('doc-2', 80);

        expect(rememberedDocTop('doc-1')).toBe(420);
        expect(rememberedDocTop('doc-2')).toBe(80);
    });

    it('forgets a tab once the window says it is gone', () => {
        rememberDocTop('doc-3', 120);
        forgetDocTop('doc-3');

        expect(rememberedDocTop('doc-3')).toBe(0);
    });
});
