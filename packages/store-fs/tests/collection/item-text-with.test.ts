import { parseCollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { itemTextWith } from '../../src/collection/item-text-with.js';

const created = parseCollectionItem({
    kind: 'message',
    name: 'Pedido creado',
    tags: ['pagos'],
    payload: '{"id":1}',
});

describe('the text of an item with its fields written in', () => {
    it('makes a whole file out of nothing, with the keys of the kind beside the envelope', () => {
        const text = itemTextWith(null, created);

        expect(text).toContain('kind: message');
        expect(text).toContain('payload: ');
        expect(text).not.toContain('body:');
    });

    it('edits the text it is given and keeps comments and unknown keys', () => {
        const before = `# el primero\n${itemTextWith(null, created)}retries: 3\n`;
        const after = itemTextWith(before, { ...created, name: 'Pedido aceptado' });

        expect(after).toContain('# el primero');
        expect(after).toContain('retries: 3');
        expect(after).toContain('name: Pedido aceptado');
    });

    it('refuses a text that is not YAML', () => {
        expect(() => itemTextWith('kind: [\n', created)).toThrow();
    });

    it('refuses a text that is YAML and not an item', () => {
        expect(() => itemTextWith('hola: 1\n', created)).toThrow();
    });
});
