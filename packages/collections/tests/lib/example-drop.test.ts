import type { CollectionNode } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    carriedExampleIn,
    dataOfCarriedExample,
    takesExample,
} from '../../src/lib/example-drop.js';

const CARRIED = { fromPath: 'crear', itemKind: 'request', resource: 'r://crear/creado' };

function item(path: string, itemKind: string): CollectionNode {
    return { itemKind, kind: 'item', name: path, path } as CollectionNode;
}

describe('an example carried over the tree (example-drop)', () => {
    it('travels with the data it is read back from', () => {
        expect(carriedExampleIn(dataOfCarriedExample(CARRIED))).toEqual(CARRIED);
    });

    it('is not in a drag that carries nodes', () => {
        expect(carriedExampleIn({ paths: ['crear'] })).toBeNull();
        expect(carriedExampleIn({ exampleFrom: 'a', exampleKind: 'b' })).toBeNull();
    });

    it('lands on another item of its kind', () => {
        expect(takesExample(CARRIED, item('listar', 'request'))).toBe(true);
    });

    it('does not land where it is, on another kind, nor on a folder', () => {
        const folder = { children: [], kind: 'folder', name: 'a', path: 'a' } as unknown;

        expect(takesExample(CARRIED, item('crear', 'request'))).toBe(false);
        expect(takesExample(CARRIED, item('listar', 'message'))).toBe(false);
        expect(takesExample(CARRIED, folder as CollectionNode)).toBe(false);
        expect(takesExample(null, item('listar', 'request'))).toBe(false);
    });
});
