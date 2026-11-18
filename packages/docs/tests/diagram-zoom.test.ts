import { describe, expect, it } from 'vitest';

import { DIAGRAM_FIT, DIAGRAM_ZOOM, diagramZoom } from '../src/lib/diagram-zoom.js';

describe('the size of a diagram', () => {
    /** A diagram opens fitted to the page: the step it opens at is the width of the page. */
    it('opens at the width of the page', () => {
        expect(DIAGRAM_ZOOM[DIAGRAM_FIT]).toBe(1);
        expect(diagramZoom(DIAGRAM_FIT)).toBe('1');
    });

    it('is told to the stylesheet as the multiple of its step', () => {
        expect(diagramZoom(0)).toBe('0.5');
        expect(diagramZoom(DIAGRAM_ZOOM.length - 1)).toBe('3');
    });

    it('falls back to the width of the page for a step that does not exist', () => {
        expect(diagramZoom(DIAGRAM_ZOOM.length)).toBe('1');
        expect(diagramZoom(-1)).toBe('1');
    });
});
