import { describe, expect, it } from 'vitest';

import { importResourcesOf } from '../../../src/asyncapi/import/import-resources.js';
import { documentToInterop } from '../../../src/asyncapi/import/document-to-interop.js';
import type { ImportResource, InteropDocument, InteropOperation } from '@mandor/interop-core';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}

function documentOf(overrides: Partial<InteropDocument>): InteropDocument {
    return {
        name: 'Pasarela',
        sourceId: 'abc',
        servers: [],
        security: {},
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
        ...overrides,
    };
}

function operationOf(overrides: Partial<InteropOperation>): InteropOperation {
    return {
        name: 'registrarPedido',
        channel: 'pedidosEntrantes',
        direction: 'outgoing',
        security: [],
        extras: {},
        ...overrides,
    };
}

function resourcesOf(document: InteropDocument): ImportResource[] {
    return importResourcesOf(document);
}

describe('importResourcesOf', () => {
    it('builds one folder per tag group, named as the document groups its traffic', async () => {
        const ir = await documentToInterop(textOf('pasarela-3.yaml'));
        const folders = importResourcesOf(ir).filter((resource) => resource.place === 'folder');

        expect(folders.map((folder) => folder.route)).toEqual([
            'pasarela/recibos',
            'pasarela/avisos',
        ]);
        expect(folders[0]?.name).toBe('recibos');
    });

    it('writes one item per operation the client can send, named as the wire calls it', async () => {
        const ir = await documentToInterop(textOf('pasarela-3.yaml'));
        const items = importResourcesOf(ir).filter((resource) => resource.place === 'item');
        const origin = { kind: 'asyncapi', sourceId: ir.sourceId } as const;

        expect(items).toHaveLength(2);
        expect(items[0]).toMatchObject({
            place: 'item',
            route: 'pasarela/recibos/recibos-salientes',
            name: 'recibos/salientes',
            origin,
        });
        expect(items[0]?.fields).toMatchObject({
            channel: 'recibos/salientes',
            payloadType: 'json',
        });
        expect(String(items[0]?.fields['schema'])).toContain('"total"');
        expect(String(items[1]?.fields['schema'])).toContain('"total"');
    });

    it('leaves the operations the client can only receive out, folders included', async () => {
        const ir = await documentToInterop(textOf('pasarela-3.yaml'));
        const resources = importResourcesOf(ir);

        expect(resources.find((resource) => resource.name === 'registrarPedido')).toBeUndefined();
        expect(resources.filter((resource) => resource.name === 'pedidos')).toHaveLength(0);
    });

    it('groups under the document name when nothing tags the operation', () => {
        const resources = resourcesOf(
            documentOf({
                channels: [{ name: 'recibosSalientes', address: 'recibos/salientes', extras: {} }],
                operations: [operationOf({ channel: 'recibosSalientes' })],
            }),
        );
        const folders = resources.filter((resource) => resource.place === 'folder');

        expect(folders.map((folder) => folder.name)).toEqual(['Pasarela']);
        expect(resources.find((resource) => resource.place === 'item')?.route).toBe(
            'pasarela/pasarela/recibos-salientes',
        );
    });

    it('prefers the domain the document declares over a plain tag', () => {
        const folders = resourcesOf(
            documentOf({
                operations: [
                    operationOf({
                        extras: { tags: [{ name: 'module:pagos' }, { name: 'usuarios' }] },
                    }),
                ],
            }),
        ).filter((resource) => resource.place === 'folder');

        expect(folders.map((folder) => folder.name)).toEqual(['pagos']);
    });

    it('reads the tags of the message when the operation carries none', () => {
        const folders = resourcesOf(
            documentOf({
                operations: [
                    operationOf({
                        message: { examples: [], extras: { tags: [{ name: 'recibos' }] } },
                    }),
                ],
            }),
        ).filter((resource) => resource.place === 'folder');

        expect(folders.map((folder) => folder.name)).toEqual(['recibos']);
    });

    it('keeps two names that slugify alike apart inside the same folder', () => {
        const routes = resourcesOf(
            documentOf({
                channels: [
                    { name: 'listaUno', address: 'lista uno', extras: {} },
                    { name: 'lista-uno', address: 'lista-uno', extras: {} },
                ],
                operations: [
                    operationOf({ name: 'primera', channel: 'listaUno' }),
                    operationOf({ name: 'segunda', channel: 'lista-uno' }),
                ],
            }),
        )
            .filter((resource) => resource.place === 'item')
            .map((item) => item.route);

        expect(routes).toEqual(['pasarela/pasarela/lista-uno', 'pasarela/pasarela/lista-uno-2']);
    });

    it('seeds the payload from the schema when the document ships no example', () => {
        const items = resourcesOf(
            documentOf({
                channels: [{ name: 'recibosSalientes', address: 'recibos/salientes', extras: {} }],
                operations: [
                    operationOf({
                        message: { examples: [], payloadSchema: 'recibo', extras: {} },
                    }),
                ],
                payloadSchemas: {
                    recibo: {
                        text: JSON.stringify({
                            type: 'object',
                            properties: { id: { type: 'string' } },
                        }),
                        extras: {},
                    },
                },
            }),
        ).filter((resource) => resource.place === 'item');

        expect(items[0]?.fields['payload']).toBe('{"id":""}');
    });
});
