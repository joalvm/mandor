import type { CollectionNode } from '@mandor/schema';

function item(path: string, name: string): CollectionNode {
    return { kind: 'item', itemKind: 'message', name, path, tags: [] };
}

/** Two collections and four items: the shape the closing test of the tree counts rows against. */
export const TWO_FOLDERS: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Pedidos',
        path: 'pedidos',
        children: [
            item('pedidos/pedido-creado', 'Pedido creado'),
            item('pedidos/pedido-pagado', 'Pedido pagado'),
        ],
    },
    {
        kind: 'collection',
        name: 'Envios',
        path: 'envios',
        children: [
            item('envios/envio-creado', 'Envio creado'),
            item('envios/envio-anulado', 'Envio anulado'),
        ],
    },
];
