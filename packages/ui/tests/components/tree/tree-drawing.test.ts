import { describe, expect, it, vi } from 'vitest';

import { lineScopeOf, type TreeDrawing } from '../../../src/components/tree/tree-drawing.js';

function drawing(): TreeDrawing {
    return {
        chevrons: true,
        commands: { keyDown: vi.fn(), press: vi.fn(), toggle: vi.fn() },
        focus: { claim: vi.fn(), claimed: vi.fn(), id: 'b', pending: true, take: vi.fn() },
        lines: [
            { id: 'a', level: 1, expanded: true },
            { id: 'b', level: 2 },
        ],
        selected: new Set(['a']),
        tabStop: 1,
    };
}

describe('the scope a line of the tree reads', () => {
    it('says where the line sits and what state it is in', () => {
        const drawn = drawing();

        expect(lineScopeOf(drawn, 0)).toMatchObject({
            chevrons: true,
            claimsFocus: false,
            expanded: true,
            level: 1,
            selected: true,
            tabStop: false,
        });
        expect(lineScopeOf(drawn, 1)).toMatchObject({
            claimsFocus: true,
            level: 2,
            selected: false,
            tabStop: true,
        });
    });

    it('tells the tree what happened to the line, by its place', () => {
        const drawn = drawing();
        const scope = lineScopeOf(drawn, 1);

        const activation = {
            altKey: false,
            ctrlKey: false,
            keep: false,
            metaKey: false,
            shiftKey: false,
        };

        scope.onFocus();
        scope.onPress(activation);

        expect(drawn.focus.take).toHaveBeenCalledWith('b');
        expect(drawn.commands.press).toHaveBeenCalledWith(1, activation);
    });

    it('tells the tree the chevron of the line was pressed', () => {
        const drawn = drawing();

        lineScopeOf(drawn, 0).onToggle();

        expect(drawn.commands.toggle).toHaveBeenCalledWith(0);
    });
});
