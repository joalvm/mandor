import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

import { InsomniaParseError } from '../../../src/insomnia/document/insomnia-parse-error.js';
import { readV5 } from '../../../src/insomnia/document/read-v5.js';
import { fixtureText } from '../support/fixture.js';

const TYPE = 'collection.insomnia.rest/5.0';

function fixtureRoot(): unknown {
    return parse(fixtureText('collection-v5.yaml'));
}

describe('readV5', () => {
    it('reads the tree as it is written', () => {
        const [document] = readV5(fixtureRoot());

        expect(document).toMatchObject({
            sourceId: 'workspace:wrk_tienda',
            name: 'Tienda de Mascotas',
            description: 'La tienda, de punta a punta.',
        });
        expect(document?.children.map((node) => node.name)).toEqual([
            'Mascotas',
            'Salud',
            'Feed en vivo',
        ]);
        expect(document?.children[0]).toMatchObject({
            kind: 'folder',
            description: 'Todo lo de las mascotas',
            authentication: { type: 'bearer' },
        });
    });

    it('tells a folder by its children and a request by its method, with the description under meta', () => {
        const [document] = readV5(fixtureRoot());
        const folder = document?.children[0];
        const request = folder?.kind === 'folder' ? folder.children[0] : undefined;

        expect(request).toMatchObject({
            kind: 'request',
            method: 'GET',
            description: 'Devuelve la página pedida.',
            parameters: [{ name: 'page' }, { name: 'debug', disabled: true }],
        });
    });

    it('names an item that is none of them, such as a gRPC request, and leaves it out', () => {
        const [document] = readV5(fixtureRoot());

        expect(document?.skipped).toEqual([{ kind: 'item', name: 'Catálogo' }]);
    });

    it('reads the environments: the base one and the sub ones', () => {
        const [document] = readV5(fixtureRoot());

        expect(document?.base?.name).toBe('Base Environment');
        expect(document?.environments.map((each) => each.name)).toEqual(['Prod', 'Staging']);
        expect(document?.environments[0]?.data).toEqual({ base: 'https://prod.test' });
    });

    it('reads a collection that says nothing but its type', () => {
        expect(readV5({ type: TYPE })).toMatchObject([
            { name: '', description: '', children: [], base: undefined, environments: [] },
        ]);
    });

    it('reads an item that has no meta, and names an item with nothing in it', () => {
        const [document] = readV5({ type: TYPE, collection: [{ name: 'R', method: 'GET' }, {}] });

        expect(document?.children).toMatchObject([{ kind: 'request', name: 'R', description: '' }]);
        expect(document?.skipped).toEqual([{ kind: 'item', name: '' }]);
    });

    it('leaves out an item whose meta names no id, since only an id tells a WebSocket request', () => {
        const [document] = readV5({ type: TYPE, collection: [{ name: 'X', meta: {} }] });

        expect(document?.skipped).toEqual([{ kind: 'item', name: 'X' }]);
    });

    it('reads an environment that has no sub ones and no data', () => {
        const [document] = readV5({ type: TYPE, name: 'X', environments: { name: 'Base' } });

        expect(document).toMatchObject({ base: { name: 'Base', data: {} }, environments: [] });
    });

    it('refuses a file that is not shaped as a collection, naming where', () => {
        const attempt = () => readV5({ type: TYPE, collection: 'x' });

        expect(attempt).toThrow(InsomniaParseError);
        expect(attempt).toThrow('collection');
    });

    it('refuses an item that is not shaped as one, naming where', () => {
        expect(() => readV5({ type: TYPE, collection: [{ children: 'x' }] })).toThrow('children');
    });

    it('reads the scripts and the switches a request or a folder nests', () => {
        const scripts = { preRequest: 'a();', afterResponse: 'b();' };
        const [document] = readV5({
            type: TYPE,
            collection: [
                { name: 'Con todo', children: [], scripts },
                {
                    name: 'Pide',
                    method: 'GET',
                    scripts,
                    settings: {
                        followRedirects: 'off',
                        encodeUrl: false,
                        rebuildPath: false,
                        renderRequestBody: false,
                        cookies: { send: false, store: false },
                    },
                },
                { name: 'Nada', method: 'GET' },
            ],
        });

        expect(document?.children[0]).toMatchObject({ scripts });
        expect(document?.children[1]).toMatchObject({
            scripts,
            settings: {
                followRedirects: 'off',
                encodeUrl: false,
                rebuildPath: false,
                renderRequestBody: false,
                sendCookies: false,
                storeCookies: false,
            },
        });
        expect(document?.children[2]).toMatchObject({
            scripts: { preRequest: '', afterResponse: '' },
            settings: {
                followRedirects: 'global',
                encodeUrl: true,
                rebuildPath: true,
                renderRequestBody: true,
                sendCookies: true,
                storeCookies: true,
            },
        });
    });
});
