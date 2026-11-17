import { afterEach, describe, expect, it, vi } from 'vitest';

import { tabStripActionDeclarations } from '../../src/tab/tab-strip-action-registry.js';

const UNDO: (() => void)[] = [];

afterEach(() => {
    for (const each of UNDO.splice(0)) {
        each();
    }
});

describe('what every strip of the window offers beside its tabs', () => {
    it('lists the actions in the order each one arrived', () => {
        UNDO.push(tabStripActionDeclarations.declare({ id: 'strip.second' }));
        UNDO.push(tabStripActionDeclarations.declare({ id: 'strip.first' }));
        UNDO.push(tabStripActionDeclarations.declarePart('strip.first', 'content', 'plus'));

        expect(tabStripActionDeclarations.list().map((each) => each.id)).toEqual([
            'strip.second',
            'strip.first',
        ]);
        expect(tabStripActionDeclarations.get('strip.first')?.content).toBe('plus');
    });

    it('takes an action back out with its cleanup and tells whoever draws the strips', () => {
        const listener = vi.fn();
        const stop = tabStripActionDeclarations.subscribe(listener);
        const undeclare = tabStripActionDeclarations.declare({ id: 'strip.only' });

        undeclare();
        stop();

        expect(listener).toHaveBeenCalledTimes(2);
        expect(tabStripActionDeclarations.get('strip.only')).toBeUndefined();
    });
});
