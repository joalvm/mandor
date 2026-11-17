import { describe, expect, it } from 'vitest';

import { InsomniaParseError } from '../../../src/insomnia/document/insomnia-parse-error.js';
import { readV4 } from '../../../src/insomnia/document/read-v4.js';
import { fixtureJson } from '../support/fixture.js';

function exportOf(...resources: Record<string, unknown>[]): unknown {
    return { _type: 'export', __export_format: 4, resources };
}

const WORKSPACE = { _id: 'wrk_1', _type: 'workspace', name: 'Tienda' };

describe('readV4', () => {
    it('rebuilds the tree the parent ids describe, in the order Insomnia shows it', () => {
        const [document] = readV4(fixtureJson('collection-v4.json'));

        expect(document).toMatchObject({
            sourceId: 'workspace:wrk_tienda',
            name: 'Tienda de Mascotas',
            description: 'La tienda, de punta a punta.',
        });
        expect(document?.children.map((node) => node.name)).toEqual([
            'Salud',
            'Mascotas',
            'Feed en vivo',
        ]);
        expect(document?.children[1]).toMatchObject({
            kind: 'folder',
            description: 'Todo lo de las mascotas',
            authentication: { type: 'bearer' },
        });
    });

    it('reads a request with its method, url, rows and body', () => {
        const [document] = readV4(fixtureJson('collection-v4.json'));
        const folder = document?.children[1];
        const children = folder?.kind === 'folder' ? folder.children : [];

        expect(children.map((node) => node.name)).toEqual(['Lista de mascotas', 'Alta de mascota']);
        expect(children[0]).toMatchObject({
            kind: 'request',
            method: 'get',
            url: '{{ _.base }}/pets/:species',
            description: 'Devuelve la página pedida.',
            pathParameters: [{ name: 'species', value: 'dog' }],
        });
        expect(children[1]).toMatchObject({ body: { mimeType: 'application/json' } });
    });

    it('takes the first environment of the workspace as the base and the ones under it as sub', () => {
        const [document] = readV4(fixtureJson('collection-v4.json'));

        expect(document?.base?.name).toBe('Base Environment');
        expect(document?.base?.data).toMatchObject({ base: 'https://api.test', retries: 3 });
        expect(document?.environments.map((each) => each.name)).toEqual(['Prod', 'Staging']);
    });

    it('names a request of a protocol it does not read, and says nothing of what is not a request at all', () => {
        const [document] = readV4(fixtureJson('collection-v4.json'));

        expect(document?.skipped).toEqual([{ kind: 'grpc_request', name: 'Catálogo' }]);
    });

    it('keeps the other environments of the workspace as sub ones', () => {
        const [document] = readV4(
            exportOf(
                WORKSPACE,
                {
                    _id: 'e1',
                    _type: 'environment',
                    parentId: 'wrk_1',
                    name: 'Base',
                    data: { a: 1 },
                },
                { _id: 'e2', _type: 'environment', parentId: 'wrk_1', name: 'Dev', data: { a: 2 } },
            ),
        );

        expect(document?.base?.name).toBe('Base');
        expect(document?.environments).toEqual([{ name: 'Dev', data: { a: 2 } }]);
    });

    it('names a request of another protocol even when it has no name', () => {
        const [document] = readV4(
            exportOf(WORKSPACE, { _id: 'g', _type: 'grpc_request', parentId: 'wrk_1' }),
        );

        expect(document?.skipped).toEqual([{ kind: 'grpc_request', name: '' }]);
    });

    it('reads a folder that says nothing of itself as a folder with no description', () => {
        const [document] = readV4(
            exportOf(WORKSPACE, { _id: 'f', _type: 'request_group', parentId: 'wrk_1' }),
        );

        expect(document?.children).toMatchObject([{ kind: 'folder', name: '', description: '' }]);
    });

    it('has no base when the workspace has no environment', () => {
        const [document] = readV4(exportOf(WORKSPACE));

        expect(document).toMatchObject({ base: undefined, environments: [], children: [] });
    });

    it('reads one collection per workspace of an export of the whole app', () => {
        const documents = readV4(
            exportOf(
                WORKSPACE,
                { _id: 'wrk_2', _type: 'workspace' },
                { _id: 'r1', _type: 'request', parentId: 'wrk_2', method: 'GET' },
            ),
        );

        expect(documents.map((document) => document.name)).toEqual(['Tienda', '']);
        expect(documents[1]?.children).toMatchObject([{ kind: 'request', name: '', url: '' }]);
        expect(documents[0]?.children).toEqual([]);
    });

    it('lists a request with no sort key first, as Insomnia does', () => {
        const [document] = readV4(
            exportOf(
                WORKSPACE,
                { _id: 'a', _type: 'request', parentId: 'wrk_1', name: 'A', metaSortKey: 5 },
                { _id: 'b', _type: 'request', parentId: 'wrk_1', name: 'B' },
                { _id: 'c', _type: 'request', name: 'Orphan' },
            ),
        );

        expect(document?.children.map((node) => node.name)).toEqual(['B', 'A']);
    });

    it('refuses an export with no workspace', () => {
        expect(() => readV4(exportOf({ _id: 'r', _type: 'request' }))).toThrow(
            'The export has no workspace',
        );
    });

    it('refuses a list that is not a list, naming where', () => {
        const attempt = () => readV4({ _type: 'export', __export_format: 4, resources: 'x' });

        expect(attempt).toThrow(InsomniaParseError);
        expect(attempt).toThrow('resources');
    });

    it('reads the scripts and the switches it writes flat, as version 5 nests them', () => {
        const [document] = readV4(
            exportOf(
                WORKSPACE,
                {
                    _id: 'fld_1',
                    _type: 'request_group',
                    parentId: 'wrk_1',
                    name: 'Carpeta',
                    preRequestScript: 'a();',
                },
                {
                    _id: 'req_1',
                    _type: 'request',
                    parentId: 'fld_1',
                    name: 'Pide',
                    afterResponseScript: 'b();',
                    settingFollowRedirects: 'on',
                    settingEncodeUrl: false,
                    settingRebuildPath: false,
                    settingRenderRequestBody: false,
                    settingSendCookies: false,
                    settingStoreCookies: false,
                },
            ),
        );

        expect(document?.children[0]).toMatchObject({
            scripts: { preRequest: 'a();', afterResponse: '' },
            children: [
                {
                    scripts: { preRequest: '', afterResponse: 'b();' },
                    settings: {
                        followRedirects: 'on',
                        encodeUrl: false,
                        rebuildPath: false,
                        renderRequestBody: false,
                        sendCookies: false,
                        storeCookies: false,
                    },
                },
            ],
        });
    });
});
