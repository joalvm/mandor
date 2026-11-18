import type { ChoiceNode } from './choice-model.js';

/** Un workspace de Mandor Request: colecciones con carpetas y requests, y sus entornos. */
export const REQUEST_TREE: ChoiceNode = {
    children: [
        {
            children: [
                {
                    children: [
                        { id: 'cobros-crear', method: 'POST', name: 'Crear cobro' },
                        { id: 'cobros-ver', method: 'GET', name: 'Ver cobro' },
                        { id: 'cobros-anular', method: 'DELETE', name: 'Anular cobro' },
                    ],
                    id: 'cobros',
                    name: 'Cobros',
                },
                { id: 'metodos-listar', method: 'GET', name: 'Listar métodos de pago' },
            ],
            glyph: 'collection',
            id: 'pagos',
            name: 'Pagos',
        },
        {
            children: [
                { id: 'perfil-ver', method: 'GET', name: 'Ver perfil' },
                { id: 'perfil-editar', method: 'PATCH', name: 'Actualizar perfil' },
            ],
            glyph: 'collection',
            id: 'usuarios',
            name: 'Usuarios',
        },
        {
            children: [
                { glyph: 'environment', id: 'entorno-local', name: 'Local' },
                { glyph: 'environment', id: 'entorno-produccion', name: 'Producción' },
            ],
            glyph: 'environment',
            id: 'entornos',
            name: 'Entornos',
        },
    ],
    glyph: 'workspace',
    id: 'tienda',
    name: 'Tienda',
};

/** Un workspace de Mandor Realtime: colecciones de eventos y conexiones. */
export const CONNECTION_TREE: ChoiceNode = {
    children: [
        {
            children: [
                { glyph: 'connection', id: 'gw-local', name: 'wss gateway.local' },
                { glyph: 'connection', id: 'gw-staging', name: 'wss gateway.staging' },
            ],
            glyph: 'connection',
            id: 'conexiones',
            name: 'Conexiones',
        },
        {
            children: [
                { glyph: 'message', id: 'dev-request', name: 'device-request' },
                { glyph: 'message', id: 'dev-ack', name: 'device-ack' },
                { glyph: 'message', id: 'dev-status', name: 'device-status' },
            ],
            glyph: 'collection',
            id: 'eventos',
            name: 'Eventos',
        },
    ],
    glyph: 'workspace',
    id: 'dispositivos',
    name: 'Dispositivos',
};

/** Todas las hojas de un árbol: lo que "elegir todo" marca. */
export function allLeavesOf(node: ChoiceNode): Set<string> {
    if (node.children === undefined) {
        return new Set([node.id]);
    }

    return new Set(node.children.flatMap((child) => [...allLeavesOf(child)]));
}
