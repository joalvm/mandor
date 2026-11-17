import type { CollectionNode } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { composerEventName } from '../../../../src/renderer/features/connections/lib/composer-event-name.js';

const SALUDO = 'mandor://demo/payments/item/mensajes/saludo';

function folder(name: string, path: string, children: CollectionNode[]): CollectionNode {
    return { children, kind: 'folder', name, path };
}

function item(name: string, path: string): CollectionNode {
    return { itemKind: 'message', kind: 'item', name, path, tags: [] };
}

/**
 * The collection owns the name of an event; the composer only knows where to look it up. A name
 * copied when the event was opened is the name it had that day, and a rename would leave the
 * two saying different things about the same file.
 */
describe('the name the composer writes over the event it holds', () => {
    it('is whatever the collection calls the event now', () => {
        const nodes = [folder('Mensajes', 'mensajes', [item('Saludo cordial', 'mensajes/saludo')])];

        expect(composerEventName(SALUDO, 'Saludo', nodes)).toBe('Saludo cordial');
    });

    it('is the name it was opened under while the tree is still coming', () => {
        expect(composerEventName(SALUDO, 'Saludo', [])).toBe('Saludo');
    });

    it('is the name it was opened under when the composer holds no file', () => {
        expect(composerEventName('', 'Saludo', [])).toBe('Saludo');
    });

    it('is the name it was opened under when the resource is of no workspace', () => {
        expect(composerEventName('mandor://_app/settings', 'Ajustes', [])).toBe('Ajustes');
    });
});
