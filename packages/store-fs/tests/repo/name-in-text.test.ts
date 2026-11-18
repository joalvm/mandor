import { describe, expect, it } from 'vitest';

import { nameInText } from '../../src/repo/name-in-text.js';

const WS = 'workspaces/pagos';

describe('the visible name a file of the repo carries (name-in-text)', () => {
    it.each([
        ['an item', `${WS}/collections/pedidos/x9k2m4p7q1w3.yaml`],
        ['a folder', `${WS}/collections/pedidos/folder.yaml`],
        ['a collection', `${WS}/collections/pagos/collection.yaml`],
        ['a workspace', `${WS}/workspace.yaml`],
        ['an environment', `${WS}/environments/4t8k2m9x1c0d.yaml`],
        ['a connection', `${WS}/connections/7h3n5v8b2z4q.yaml`],
    ])('reads the name of %s from its text', (_case, path) => {
        expect(nameInText(path, 'kind: message\nname: Crear pedido\n')).toBe('Crear pedido');
    });

    it('names the globals of the origin by what they are: the file carries no name', () => {
        expect(nameInText('globals.yaml', 'variables: []\n')).toBe('Globals');
    });

    it('reads the name of a file whose later lines do not parse', () => {
        const path = `${WS}/collections/pedidos/x9k2m4p7q1w3.yaml`;

        expect(nameInText(path, 'name: Pedido roto\nurl: [unclosed\n')).toBe('Pedido roto');
    });

    it('reads the title of a doc from its front matter', () => {
        const text = '---\ntitle: Notas\n---\n# Otra cosa\n';

        expect(nameInText(`${WS}/docs/k3m9x2q7a4bd.md`, text)).toBe('Notas');
    });

    it('reads the title of a doc with no front matter from its file name', () => {
        expect(nameInText(`${WS}/docs/Notas.md`, '# Otra cosa\n')).toBe('Notas');
    });

    it.each([
        ['an order file with no name of its own', `${WS}/collections/collections.yaml`],
        ['the file of the repo', 'mandor.yaml'],
        ['a file that is no entity', `${WS}/collections/pedidos/body.json`],
    ])('says nothing for %s', (_case, path) => {
        expect(nameInText(path, 'order: [a]\n')).toBe('');
    });
});
