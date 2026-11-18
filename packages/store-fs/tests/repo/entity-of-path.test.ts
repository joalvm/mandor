import { describe, expect, it } from 'vitest';

import { entityOfPath } from '../../src/repo/entity-of-path.js';

const WS = 'workspaces/pagos';

describe('entityOfPath', () => {
    it.each([
        ['mandor.yaml', { area: 'repo' }],
        ['globals.yaml', { area: 'globals' }],
        [`${WS}/workspace.yaml`, { area: 'workspace', workspaceId: 'pagos' }],
        [
            `${WS}/collections/collections.yaml`,
            { area: 'collections', workspaceId: 'pagos', path: '' },
        ],
        [
            `${WS}/collections/crear.yaml`,
            { area: 'collections', workspaceId: 'pagos', path: 'crear' },
        ],
        [
            `${WS}/collections/pedidos/crear.yaml`,
            { area: 'collections', workspaceId: 'pagos', path: 'pedidos/crear' },
        ],
        [
            `${WS}/collections/pedidos/folder.yaml`,
            { area: 'collections', workspaceId: 'pagos', path: 'pedidos' },
        ],
        [
            `${WS}/collections/pagos/collection.yaml`,
            { area: 'collections', workspaceId: 'pagos', path: 'pagos' },
        ],
        [
            `${WS}/docs/Notas de la API.md`,
            { area: 'doc', workspaceId: 'pagos', name: 'Notas de la API.md' },
        ],
        [
            `${WS}/environments/local.yaml`,
            { area: 'environment', workspaceId: 'pagos', id: 'local' },
        ],
        [`${WS}/connections/chat.yaml`, { area: 'connection', workspaceId: 'pagos', id: 'chat' }],
    ])('names `%s`', (path, entity) => {
        expect(entityOfPath(path)).toEqual(entity);
    });

    it.each([
        '',
        'README.md',
        '.gitignore',
        'workspaces',
        'workspaces/pagos',
        'workspaces/../x/workspace.yaml',
        'workspaces/Pagos/workspace.yaml',
        `${WS}/notes.txt`,
        `${WS}/workspace.yaml/extra`,
        `${WS}/collections`,
        `${WS}/docs/sub/a.md`,
        `${WS}/docs/a.txt`,
        `${WS}/collections/Pedidos/crear.yaml`,
        `${WS}/collections/pedidos/crear.json`,
        `${WS}/collections/folder.yaml`,
        `${WS}/collections/collection.yaml`,
        `${WS}/environments/Local.yaml`,
        `${WS}/environments/a/b.yaml`,
        `${WS}/connections/chat.json`,
        `${WS}/bodies/x.bin`,
        `${WS}/constructor/x.yaml`,
        `${WS}/__proto__/x.yaml`,
    ])('names nothing for `%s`', (path) => {
        expect(entityOfPath(path)).toBeNull();
    });
});
