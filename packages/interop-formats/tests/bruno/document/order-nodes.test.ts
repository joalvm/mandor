import { describe, expect, it } from 'vitest';

import { ordered, sequenceOf } from '../../../src/bruno/document/order-nodes.js';
import { folderNode, requestNode } from '../support/trees.js';

describe('sequenceOf', () => {
    it('reads the number a YAML file wrote and the text a .bru file wrote', () => {
        expect(sequenceOf(3)).toBe(3);
        expect(sequenceOf('4')).toBe(4);
    });

    it.each([
        ['nothing', undefined],
        ['null', null],
        ['text that is no number', 'x'],
        ['a record', {}],
    ])('sends %s after every node that has a sequence', (_name, value) => {
        expect(sequenceOf(value)).toBe(Number.MAX_SAFE_INTEGER);
    });
});

describe('ordered', () => {
    it('puts the nodes in the order of their sequence, folders and requests together', () => {
        const nodes = [
            requestNode({ name: 'c', seq: 3 }),
            folderNode({ name: 'a', seq: 1 }),
            requestNode({ name: 'b', seq: 2 }),
        ];

        expect(ordered(nodes).map((node) => node.name)).toEqual(['a', 'b', 'c']);
    });

    it('breaks a tie by name, without case', () => {
        const nodes = [
            requestNode({ name: 'beta', seq: 1 }),
            requestNode({ name: 'Alfa', seq: 1 }),
        ];

        expect(ordered(nodes).map((node) => node.name)).toEqual(['Alfa', 'beta']);
    });

    it('leaves the nodes it was given as they were', () => {
        const nodes = [requestNode({ name: 'b', seq: 2 }), requestNode({ name: 'a', seq: 1 })];

        ordered(nodes);

        expect(nodes.map((node) => node.name)).toEqual(['b', 'a']);
    });
});
