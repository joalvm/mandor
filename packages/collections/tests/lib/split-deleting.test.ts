import { describe, expect, it } from 'vitest';

import { splitDeleting } from '../../src/lib/split-deleting.js';

import { WITH_EXAMPLES } from '../support/login-with-examples.js';

describe('telling apart what a delete reaches', () => {
    it('takes the nodes the paths name, and the examples the ids name', () => {
        const { examples, nodes } = splitDeleting(WITH_EXAMPLES, ['acceso/login:Roto']);

        expect(nodes).toEqual([]);
        expect(examples.map(({ example, item }) => [item.path, example.key])).toEqual([
            ['acceso/login', 'Roto'],
        ]);
    });

    it('does not count an example again when its item goes with a node', () => {
        const { examples, nodes } = splitDeleting(WITH_EXAMPLES, [
            'acceso/login:Roto',
            'acceso/login',
        ]);

        expect(nodes.map((node) => node.path)).toEqual(['acceso/login']);
        expect(examples).toEqual([]);
    });

    it('does not count an example whose folder goes either', () => {
        const { examples, nodes } = splitDeleting(WITH_EXAMPLES, ['acceso', 'acceso/login:Roto']);

        expect(nodes.map((node) => node.path)).toEqual(['acceso']);
        expect(examples).toEqual([]);
    });

    it('leaves out an id no line answers to', () => {
        const gone = splitDeleting(WITH_EXAMPLES, ['gone', 'acceso/login:Nada', 'acceso:Roto']);

        expect(gone).toEqual({ examples: [], nodes: [] });
    });
});
