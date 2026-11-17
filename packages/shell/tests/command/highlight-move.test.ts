import { describe, expect, it } from 'vitest';

import { nextHighlight } from '../../src/command/highlight-move.js';

describe('moving the highlight of the palette', () => {
    it('steps down and up one row', () => {
        expect(nextHighlight('ArrowDown', 1, 5)).toBe(2);
        expect(nextHighlight('ArrowUp', 3, 5)).toBe(2);
    });

    it('joins the ends of the list so a direction never dead-ends', () => {
        expect(nextHighlight('ArrowDown', 4, 5)).toBe(0);
        expect(nextHighlight('ArrowUp', 0, 5)).toBe(4);
    });

    it('jumps to the first and the last row', () => {
        expect(nextHighlight('Home', 3, 5)).toBe(0);
        expect(nextHighlight('End', 1, 5)).toBe(4);
    });

    it('answers nothing for a key that does not move it', () => {
        expect(nextHighlight('a', 1, 5)).toBeNull();
        expect(nextHighlight('constructor', 1, 5)).toBeNull();
    });

    it('answers nothing when there is no row to land on', () => {
        expect(nextHighlight('ArrowDown', 0, 0)).toBeNull();
        expect(nextHighlight('Home', 0, 0)).toBeNull();
    });
});
