import { describe, expect, it } from 'vitest';

import {
    countOf,
    pickableIds,
    stateOf,
    toggle,
    type ChoiceNode,
} from '../../src/choice/lib/choice-state.js';

function node(id: string, children: ChoiceNode[] = [], reason?: string): ChoiceNode {
    return { children, icon: null, id, label: id, reason };
}

const FOLDER = node('folder', [node('a'), node('b')]);
const TREE = node('all', [node('env'), FOLDER, node('barred', [], 'no transport')]);

describe('what a node is chosen by', () => {
    it('is the leaves below it, and the node itself when it holds nothing', () => {
        expect(pickableIds(FOLDER)).toEqual(['a', 'b']);
        expect(pickableIds(node('env'))).toEqual(['env']);
    });

    it('leaves out whatever has a reason, and everything a barred node holds', () => {
        expect(pickableIds(TREE)).toEqual(['env', 'a', 'b']);
        expect(pickableIds(node('closed', [node('inside')], ''))).toEqual([]);
    });
});

describe('the state of a node', () => {
    it('is unchecked with nothing chosen, checked with all of it, mixed with some', () => {
        expect(stateOf(FOLDER, new Set())).toBe('unchecked');
        expect(stateOf(FOLDER, new Set(['a', 'b']))).toBe('checked');
        expect(stateOf(FOLDER, new Set(['a']))).toBe('mixed');
    });

    it('does not count the barred, and a node with nothing to choose is never checked', () => {
        expect(stateOf(TREE, new Set(['env', 'a', 'b']))).toBe('checked');
        expect(stateOf(node('barred', [], 'why'), new Set(['barred']))).toBe('unchecked');
    });

    it('counts what is chosen out of what can be', () => {
        expect(countOf(TREE, new Set(['a', 'gone']))).toEqual({ chosen: 1, total: 3 });
    });
});

describe('toggling a node', () => {
    it('chooses the whole branch when any of it was out', () => {
        expect(toggle(new Set(['a']), FOLDER)).toEqual(new Set(['a', 'b']));
    });

    it('clears the whole branch when all of it was in, and leaves the rest alone', () => {
        expect(toggle(new Set(['a', 'b', 'env']), FOLDER)).toEqual(new Set(['env']));
    });

    it('never chooses a barred node, and does not touch the set it was given', () => {
        const chosen = new Set<string>();

        expect(toggle(chosen, node('barred', [], 'why'))).toEqual(new Set());
        expect(toggle(chosen, TREE)).toEqual(new Set(['env', 'a', 'b']));
        expect(chosen.size).toBe(0);
    });
});
