import { describe, expect, it } from 'vitest';

import { EMPTY_UI_SESSION, uiSessionSchema } from '../../src/index.js';

const PANELS = {
    sidebarWidth: 240,
    contentSplit: 58,
    collapsedSections: ['docs'],
    splits: {},
} as const;

function panelsOf(panels: unknown): unknown {
    return uiSessionSchema.parse({ ...EMPTY_UI_SESSION, activeWorkspaceId: 'payments', panels })
        .panels;
}

describe('the panels of a session written when the sections were resized by hand', () => {
    /** Nothing reads those sizes any more; the rest of the window is what the session keeps. */
    it('drops the sizes of the sections and keeps everything else', () => {
        const sectionWeights = { payments: { collection: 0.5, docs: 1.5 } };

        expect(panelsOf({ ...PANELS, sectionWeights })).toEqual(PANELS);
    });

    it('still refuses panels that are not an object', () => {
        expect(() => panelsOf(null)).toThrow();
        expect(() => panelsOf('wide')).toThrow();
    });

    it('still refuses a key nobody ever wrote', () => {
        expect(() => panelsOf({ ...PANELS, sidebarHeight: 3 })).toThrow();
    });
});
