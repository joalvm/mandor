import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';

import { documentTextWith } from '../../src/disk/document-text.js';

const source = '# la carpeta\nname: Pedidos\ncolor: azul # de la otra app\n';

describe('the text of a document with changes in it', () => {
    it('sets a key and keeps comments and keys it does not know', () => {
        const text = documentTextWith(parseDocument(source), { name: 'Envíos' });

        expect(text).toBe('# la carpeta\nname: Envíos\ncolor: azul # de la otra app\n');
    });

    it('takes a key out when its change is undefined, and leaves a key not mentioned', () => {
        const text = documentTextWith(parseDocument(source), { color: undefined });

        expect(text).toContain('name: Pedidos');
        expect(text).not.toContain('color');
    });

    it('does not wrap a long value', () => {
        const long = 'palabra '.repeat(40).trim();
        const text = documentTextWith(parseDocument(source), { name: long });

        expect(text).toContain(`name: ${long}\n`);
    });
});
