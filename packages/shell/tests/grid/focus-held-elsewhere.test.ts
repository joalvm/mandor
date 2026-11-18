import { afterEach, describe, expect, it } from 'vitest';

import { focusHeldElsewhere, focusInsideContent } from '../../src/grid/focus-held-elsewhere.js';

function placed(tag: string, parent: HTMLElement = document.body): HTMLElement {
    const element = document.createElement(tag);

    element.tabIndex = 0;
    parent.append(element);

    return element;
}

afterEach(() => {
    document.body.replaceChildren();
});

describe('whether the focus stands outside the grid', () => {
    it('says yes for something of its own outside the grid', () => {
        const grid = placed('div');

        placed('button').focus();

        expect(focusHeldElsewhere(grid)).toBe(true);
    });

    it('says no inside the grid, and when the focus stands on nothing', () => {
        const grid = placed('div');

        expect(focusHeldElsewhere(grid)).toBe(false);

        placed('button', grid).focus();

        expect(focusHeldElsewhere(grid)).toBe(false);
    });

    it('says no while there is no grid to stand outside of', () => {
        placed('button').focus();

        expect(focusHeldElsewhere(null)).toBe(false);
    });
});

describe('whether the focus stands inside what a group shows', () => {
    it('says yes for a field of the tab body, and no for the strip', () => {
        const group = placed('div');
        const strip = placed('button', group);
        const content = placed('div', group);

        content.className = 'dv-content-container';
        placed('input', content).focus();

        expect(focusInsideContent(group)).toBe(true);

        strip.focus();

        expect(focusInsideContent(group)).toBe(false);
    });

    it('says no while there is no group', () => {
        expect(focusInsideContent(undefined)).toBe(false);
    });
});
