import { describe, expect, it } from 'vitest';

import {
    choiceLines,
    filterNodes,
    foldableIds,
    foldedAfter,
    foldedByDefault,
} from '../../src/choice/lib/choice-lines.js';
import type { ChoiceNode } from '../../src/choice/lib/choice-state.js';

function node(id: string, children: ChoiceNode[] = []): ChoiceNode {
    return { children, icon: null, id, label: id.toUpperCase(), reason: undefined };
}

const ENV = node('env');
const SHOP = node('shop', [node('orders', [node('place')]), node('health')]);
const NODES = [ENV, SHOP];

function shape(folded: string[]): unknown[] {
    return choiceLines(NODES, new Set(folded)).map(({ expanded, id, level }) => ({
        expanded,
        id,
        level,
    }));
}

describe('the lines of a choice tree', () => {
    it('stand in the order of the nodes, one level deeper under what they hang from', () => {
        expect(shape([])).toEqual([
            { expanded: undefined, id: 'node:env', level: 1 },
            { expanded: true, id: 'node:shop', level: 1 },
            { expanded: true, id: 'node:orders', level: 2 },
            { expanded: undefined, id: 'node:place', level: 3 },
            { expanded: undefined, id: 'node:health', level: 2 },
        ]);
    });

    it('leave out what a folded node holds, and say the node is closed', () => {
        expect(shape(['node:shop'])).toEqual([
            { expanded: undefined, id: 'node:env', level: 1 },
            { expanded: false, id: 'node:shop', level: 1 },
        ]);
    });

    it('carry the node they draw', () => {
        const [line] = choiceLines(NODES, new Set());

        expect(line?.node).toBe(ENV);
    });
});

describe('what a choice opens folded', () => {
    it('is every branch, but the ones that ask to start open', () => {
        expect(foldedByDefault(NODES)).toEqual(new Set(['node:shop', 'node:orders']));
        expect(foldedByDefault([ENV, { ...SHOP, open: true }])).toEqual(new Set(['node:orders']));
    });
});

describe('what «fold all» closes', () => {
    it('is the line of every branch at any depth, and of no leaf', () => {
        expect(foldableIds(NODES)).toEqual(['node:shop', 'node:orders']);
        expect(foldableIds([ENV])).toEqual([]);
    });
});

describe('filtering the nodes', () => {
    it('keeps everything with an empty needle', () => {
        expect(filterNodes(NODES, '  ')).toEqual(NODES);
    });

    it('keeps a node that matches with all it holds', () => {
        expect(filterNodes(NODES, 'shop')).toEqual([SHOP]);
    });

    it('keeps a node with a match below it, with only the part that matches', () => {
        const [shop] = filterNodes(NODES, 'PLACE');

        expect(shop?.id).toBe('shop');
        expect(shop?.children.map((child) => child.id)).toEqual(['orders']);
        expect(shop?.children[0]?.children.map((child) => child.id)).toEqual(['place']);
    });

    it('drops what nothing matches', () => {
        expect(filterNodes(NODES, 'zzz')).toEqual([]);
    });
});

describe('the folds once a line opens or closes', () => {
    it('drops the line that opened and adds the one that closed, in a new set', () => {
        const folded = new Set(['node:shop']);
        const opened = foldedAfter(folded, 'node:shop', true);
        const closed = foldedAfter(folded, 'node:env', false);

        expect([...opened]).toEqual([]);
        expect([...closed]).toEqual(['node:shop', 'node:env']);
        expect([...folded]).toEqual(['node:shop']);
    });
});
