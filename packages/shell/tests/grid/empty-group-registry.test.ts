import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_GROUP_ID, emptyGroupDeclarations } from '../../src/grid/empty-group-registry.js';

const UNDO: (() => void)[] = [];

afterEach(() => {
    for (const each of UNDO.splice(0)) {
        each();
    }
});

describe('what a group with no tab shows', () => {
    it('is declared once for the window, under one id', () => {
        UNDO.push(emptyGroupDeclarations.declare({ id: EMPTY_GROUP_ID }));
        UNDO.push(emptyGroupDeclarations.declarePart(EMPTY_GROUP_ID, 'content', 'nothing here'));

        expect(EMPTY_GROUP_ID).toBe('window');
        expect(emptyGroupDeclarations.get(EMPTY_GROUP_ID)).toEqual({
            content: 'nothing here',
            id: 'window',
        });
    });

    it('tells whoever draws it when the declaration appears and when it goes', () => {
        const listener = vi.fn();
        const stop = emptyGroupDeclarations.subscribe(listener);
        const undeclare = emptyGroupDeclarations.declare({ id: EMPTY_GROUP_ID });

        expect(listener).toHaveBeenCalledTimes(1);

        undeclare();
        stop();

        expect(listener).toHaveBeenCalledTimes(2);
        expect(emptyGroupDeclarations.get(EMPTY_GROUP_ID)).toBeUndefined();
    });
});
