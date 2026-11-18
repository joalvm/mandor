import { describe, expect, it } from 'vitest';

import { chevronPressed } from '../../../src/components/row/chevron-pressed.js';
import type { TreeLineScope } from '../../../src/components/tree/tree-scope.js';

function scope(overrides: Partial<TreeLineScope>): TreeLineScope {
    return {
        chevrons: true,
        claimsFocus: false,
        expanded: true,
        level: 1,
        onClaimed: () => undefined,
        onFocus: () => undefined,
        onKeyDown: () => undefined,
        onPress: () => undefined,
        onToggle: () => undefined,
        selected: undefined,
        tabStop: false,
        ...overrides,
    };
}

function gutterWithMark(): { gutter: Element; name: Element } {
    document.body.innerHTML =
        '<div><span data-part="row-gutter"><i></i></span><span data-part="name"></span></div>';

    return {
        gutter: document.querySelector('[data-part="row-gutter"] i') ?? document.body,
        name: document.querySelector('[data-part="name"]') ?? document.body,
    };
}

describe('the click on the mark of a line (chevronPressed)', () => {
    it('is a press of the mark when it lands in the gutter of a line that holds something', () => {
        expect(chevronPressed(gutterWithMark().gutter, scope({}))).toBe(true);
    });

    it('is a press of the line anywhere else', () => {
        expect(chevronPressed(gutterWithMark().name, scope({}))).toBe(false);
    });

    it('is a press of the line when no mark is drawn, or the line holds nothing', () => {
        const { gutter } = gutterWithMark();

        expect(chevronPressed(gutter, scope({ chevrons: false }))).toBe(false);
        expect(chevronPressed(gutter, scope({ expanded: undefined }))).toBe(false);
    });
});
