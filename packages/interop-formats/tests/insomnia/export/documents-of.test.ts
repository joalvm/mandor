import { describe, expect, it } from 'vitest';

import { documentsOf } from '../../../src/insomnia/export/documents-of.js';
import { EVENTS, LOBBY, MASCOTAS, SYNC_WORKSPACE } from '../support/sample-workspace.js';

describe('documentsOf', () => {
    it('writes a file for each collection, named after it', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            collections: [
                MASCOTAS,
                {
                    name: 'Pedidos y Envíos',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [],
                },
            ],
        });

        expect(files.map((file) => file.path)).toEqual([
            'mascotas.insomnia.yaml',
            'pedidos-y-envios.insomnia.yaml',
        ]);
        expect(files[0]?.document).toMatchObject({ name: 'Mascotas' });
    });

    it('keeps two collections that are named alike in two files', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            collections: [
                MASCOTAS,
                {
                    ...MASCOTAS,
                    settings: { description: 'Otra', variables: [], headers: [] },
                },
            ],
        });

        expect(files.map((file) => file.path)).toEqual([
            'mascotas.insomnia.yaml',
            'mascotas-2.insomnia.yaml',
        ]);
    });

    it('names a file after the plain word of its kind when the name has no letters to keep', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            collections: [
                { name: '???', settings: { variables: [], headers: [] }, folders: [], items: [] },
            ],
        });

        expect(files.map((file) => file.path)).toEqual(['collection.insomnia.yaml']);
    });

    it('writes one empty collection named after the workspace to carry its environments', () => {
        const files = documentsOf({ ...SYNC_WORKSPACE, collections: [], globals: [] });

        expect(files.map((file) => file.path)).toEqual(['tienda-de-mascotas.insomnia.yaml']);
        expect(files[0]?.document).toMatchObject({
            name: 'Tienda de Mascotas',
            collection: [],
            environments: { subEnvironments: [{ name: 'Prod' }] },
        });
    });

    it('writes one empty collection to carry the variables of a workspace with no environments', () => {
        const files = documentsOf({ ...SYNC_WORKSPACE, collections: [], environments: [] });

        expect(files).toHaveLength(1);
        expect(files[0]?.document).toHaveProperty('environments');
    });

    it('writes nothing for a workspace with no collection, no environment and no variable', () => {
        expect(
            documentsOf({ ...SYNC_WORKSPACE, collections: [], environments: [], globals: [] }),
        ).toEqual([]);
    });

    it('writes the connections in the first file only, since they belong to no collection', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            connections: [LOBBY],
            collections: [
                MASCOTAS,
                {
                    name: 'Pedidos',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [],
                },
            ],
        });
        const lobbiesIn = files.map((file) =>
            (file.document['collection'] as { name: string }[]).filter(
                (item) => item.name === 'Lobby',
            ),
        );

        expect(lobbiesIn.map((found) => found.length)).toEqual([1, 0]);
    });

    it('writes one empty collection to carry the connections of a workspace that has nothing else', () => {
        const files = documentsOf({
            ...SYNC_WORKSPACE,
            connections: [LOBBY],
            collections: [],
            environments: [],
            globals: [],
        });

        expect(files).toHaveLength(1);
        expect(files[0]?.document).toMatchObject({ collection: [{ name: 'Lobby' }] });
    });

    it('does not carry a Socket.IO connection into a file of its own', () => {
        expect(
            documentsOf({
                ...SYNC_WORKSPACE,
                connections: [EVENTS],
                collections: [],
                environments: [],
                globals: [],
            }),
        ).toEqual([]);
    });
});
