import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { describe, expect, it } from 'vitest';

import { spotOfInstruction } from '../src/lib/collection-instruction.js';
import { nodeAt } from '../src/lib/node-at.js';

import { TWO_FOLDERS } from './support/two-folders.js';

const INDENT = 12;

/** What the hitbox hands back over a row, with the levels the flat list gave it. */
function over(type: Instruction['type'], currentLevel: number): Instruction {
    return { type, currentLevel, indentPerLevel: INDENT } as Instruction;
}

/** One path or many: a drag carries whatever was taken, and a row alone is a taking of one. */
function drop(dragged: string | string[], target: string, instruction: Instruction): unknown {
    const from = [dragged].flat().map((path) => nodeAt(TWO_FOLDERS, path));
    const onto = nodeAt(TWO_FOLDERS, target);
    const carried = from.filter((node) => node !== null);

    return carried.length === from.length && onto
        ? spotOfInstruction(TWO_FOLDERS, carried, onto, instruction)
        : undefined;
}

describe('where an instruction of the pointer leaves a node', () => {
    it('reads above as landing on the row it was dropped over', () => {
        expect(
            drop('pedidos/pedido-pagado', 'pedidos/pedido-creado', over('reorder-above', 2)),
        ).toEqual({ parent: 'pedidos', before: 'pedido-creado' });
    });

    it('reads below as landing on whatever came after that row', () => {
        expect(
            drop('envios/envio-creado', 'pedidos/pedido-creado', over('reorder-below', 2)),
        ).toEqual({ parent: 'pedidos', before: 'pedido-pagado' });
    });

    /** The dragged node is leaving that place, so it cannot be the one the drop lands above. */
    it('looks past the dragged node when it is the one that came after', () => {
        expect(
            drop('pedidos/pedido-pagado', 'pedidos/pedido-creado', over('reorder-below', 2)),
        ).toEqual({ parent: 'pedidos', before: null });
    });

    it('reads a child as the end of what the folder holds', () => {
        expect(drop('pedidos/pedido-creado', 'envios', over('make-child', 1))).toEqual({
            parent: 'envios',
            before: null,
        });
    });

    it('reads a reparent as landing after the ancestor of the level it names', () => {
        expect(
            drop('envios', 'pedidos/pedido-pagado', {
                type: 'reparent',
                currentLevel: 2,
                desiredLevel: 1,
                indentPerLevel: INDENT,
            }),
        ).toEqual({ parent: '', before: null });
    });

    it('answers nothing when the spot would break the shape the collection holds', () => {
        // An item has no sibling at the top level, and a collection has none inside a folder.
        expect(
            drop('envios/envio-anulado', 'pedidos/pedido-pagado', {
                type: 'reparent',
                currentLevel: 2,
                desiredLevel: 1,
                indentPerLevel: INDENT,
            }),
        ).toBeNull();
        expect(drop('pedidos', 'envios', over('make-child', 1))).toBeNull();
    });

    it('answers nothing when the hitbox blocked what was asked', () => {
        const desired = over('make-child', 1) as Exclude<
            Instruction,
            { type: 'instruction-blocked' }
        >;
        const blocked: Instruction = { type: 'instruction-blocked', desired };

        expect(drop('pedidos/pedido-creado', 'envios', blocked)).toBeNull();
    });

    /** A folder cannot hold itself, and the tree it carries would have nowhere to go. */
    it('refuses to put a folder inside what it already holds', () => {
        expect(drop('pedidos', 'pedidos/pedido-creado', over('reorder-above', 2))).toBeNull();
    });
});

describe('where an instruction of the pointer leaves many nodes', () => {
    /** Every one of them is leaving, so none can be the sibling the others land above. */
    it('looks past every dragged node, not only the first', () => {
        expect(
            drop(
                ['envios/envio-creado', 'pedidos/pedido-pagado'],
                'pedidos/pedido-creado',
                over('reorder-below', 2),
            ),
        ).toEqual({ parent: 'pedidos', before: null });
    });

    it('refuses the drop when any folder among them would land inside itself', () => {
        expect(
            drop(
                ['envios/envio-creado', 'pedidos'],
                'pedidos/pedido-creado',
                over('reorder-above', 2),
            ),
        ).toBeNull();
    });
});
