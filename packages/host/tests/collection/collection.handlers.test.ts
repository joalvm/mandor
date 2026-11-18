import { describe, expect, it } from 'vitest';

import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const { tree } = mountedWorkspace();

describe('reading the collection of a workspace from the renderer', () => {
    it('answers with the tree and no item bodies', async () => {
        const answer = await tree(WORKSPACE);

        expect(answer).toEqual({
            ok: true,
            value: [
                {
                    kind: 'collection',
                    path: 'pedidos',
                    name: 'Pedidos',
                    children: [
                        {
                            kind: 'item',
                            path: 'pedidos/pedido-creado',
                            name: 'Pedido creado',
                            itemKind: 'message',
                            tags: [],
                        },
                        {
                            kind: 'item',
                            path: 'pedidos/pedido-pagado',
                            name: 'Pedido pagado',
                            itemKind: 'message',
                            tags: [],
                        },
                    ],
                },
            ],
        });
    });

    it('refuses a request that names no workspace', async () => {
        await expect(tree({})).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
