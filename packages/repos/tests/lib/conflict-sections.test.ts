import type { ConflictItem } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import {
    allAnswered,
    itemName,
    itemsOf,
    sectionsOf,
    sideState,
} from '../../src/lib/conflict-sections.js';

function item(path: string[], shape: ConflictItem['shape'] = 'value'): ConflictItem {
    return { base: null, id: path.join('/'), ours: null, path, shape, theirs: null };
}

describe('the parts of an entity that clash (conflict-sections)', () => {
    it('groups the questions by the first step of their path, in the order they came', () => {
        const sections = sectionsOf([item(['method']), item(['url']), item(['method', 'x'])]);

        expect(sections.map((section) => section.key)).toEqual(['method', 'url']);
        expect(sections[0]?.blocks).toHaveLength(2);
    });

    it('puts the rows of one list together in one table', () => {
        const sections = sectionsOf([
            item(['headers', 'Accept#0'], 'row'),
            item(['headers', 'Cookie#0'], 'row'),
        ]);

        expect(sections).toHaveLength(1);
        expect(sections[0]?.blocks).toEqual([
            {
                items: [expect.objectContaining({ id: 'headers/Accept#0' }), expect.anything()],
                kind: 'rows',
            },
        ]);
    });

    it('starts another table when the rows belong to another list', () => {
        const sections = sectionsOf([
            item(['settings', 'a', 'x'], 'row'),
            item(['settings', 'b', 'y'], 'row'),
        ]);

        expect(sections[0]?.blocks.map((block) => block.kind)).toEqual(['rows', 'rows']);
    });

    it('keeps a question that is no row on its own, between two tables', () => {
        const sections = sectionsOf([
            item(['headers', 'Accept#0'], 'row'),
            item(['headers', 'text'], 'text'),
            item(['headers', 'Cookie#0'], 'row'),
        ]);

        expect(sections[0]?.blocks.map((block) => block.kind)).toEqual(['rows', 'single', 'rows']);
    });

    it('names the whole file with an empty key', () => {
        expect(sectionsOf([item([], 'file')]).map((section) => section.key)).toEqual(['']);
    });

    it('is done once every question has an answer, and not before', () => {
        const items = [item(['a']), item(['b'])];

        expect(allAnswered(items, (id) => id === 'a')).toBe(false);
        expect(allAnswered(items, () => true)).toBe(true);
        expect(allAnswered([], () => false)).toBe(true);
    });

    it('lists the questions of a section in the order they came, rows included', () => {
        const sections = sectionsOf([
            item(['headers', 'Accept#0'], 'row'),
            item(['headers', 'Cookie#0'], 'row'),
            item(['headers', 'x'], 'value'),
        ]);

        expect(sections.flatMap(itemsOf).map((each) => each.id)).toEqual([
            'headers/Accept#0',
            'headers/Cookie#0',
            'headers/x',
        ]);
    });

    it('names a question by the last step of its path, without the index of a row', () => {
        expect(itemName(item(['headers', 'Accept#0'], 'row'))).toBe('Accept');
        expect(itemName(item(['method']))).toBe('method');
    });

    it('tells whether a side was taken whole, in part or not at all', () => {
        const items = [item(['a']), item(['b'])];

        expect(sideState(items, {}, 'ours')).toBe(false);
        expect(sideState(items, { a: { pick: 'ours' } }, 'ours')).toBe('indeterminate');
        expect(sideState(items, { a: { pick: 'ours' }, b: { pick: 'ours' } }, 'ours')).toBe(true);
        expect(sideState(items, { a: { pick: 'theirs' } }, 'ours')).toBe(false);
    });
});
