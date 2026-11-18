import type { InteropFormat, WorkspaceData } from '@mandor/interop-core';
import type { CollectionItem, Environment } from '@mandor/schema';

import {
    mandorFormatFor,
    asyncapiFormat,
    brunoFormat,
    harFormat,
    insomniaFormat,
    openapiFormat,
    postmanFormat,
} from '../../src/index.js';

/** The value of a secret variable: a format that writes must not let it into any document. */
export const SECRET = 'hunter2-must-not-leave';

/** A workspace a format writes, and the names its items must keep when the document is read. */
type FormatSample = { data: WorkspaceData; itemNames: readonly string[] };

export type FormatEntry = {
    /** Its folder under `src/`. */
    folder: string;
    format: InteropFormat;
    /** Documents of the format, by name inside `tests/<folder>/fixtures/`: sniff knows each. */
    fixtures: readonly string[];
    /** What it writes; `null` for a format that only reads. */
    sample: FormatSample | null;
};

export type WritingEntry = FormatEntry & { sample: FormatSample };

const PROD: Environment = {
    id: 'prod',
    name: 'Prod',
    variables: [
        { name: 'baseUrl', value: 'https://api.test', enabled: true, secret: false },
        { name: 'token', value: SECRET, enabled: true, secret: true },
    ],
};

/** The item reads back under `itemName`: the name a format gives it is its own, not always the item's. */
function sampleOf(name: string, item: CollectionItem, itemName: string): FormatSample {
    return {
        itemNames: [itemName],
        data: {
            name,
            connections: [],
            environments: [PROD],
            globals: [],
            docs: [],
            collections: [
                {
                    name: 'Tienda',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: [item],
                },
            ],
        },
    };
}

const REQUEST: CollectionItem = {
    kind: 'request',
    name: 'listaMascotas',
    tags: [],
    body: {
        method: 'GET',
        url: '{{baseUrl}}/pets',
        body: { type: 'none' },
        examples: [],
        settings: { timeoutMs: 30_000, followRedirects: true, maxRedirects: 5, validateTls: true },
    },
};

const MESSAGE: CollectionItem = {
    kind: 'message',
    name: 'registrarPedido',
    tags: [],
    body: { channel: 'pedidos', direction: 'outgoing', payload: '', payloadType: 'json' },
};

/** Every format the package ships. A folder of `src/` that is not here fails the suite. */
export const ALL_FORMATS: readonly FormatEntry[] = [
    {
        folder: 'openapi',
        format: openapiFormat,
        fixtures: [
            'ida-vuelta-3.1.yaml',
            'petstore-2.0.json',
            'petstore-3.0.json',
            'sample-3.1.yaml',
        ],
        sample: sampleOf('Tienda de Mascotas', REQUEST, 'listaMascotas'),
    },
    {
        folder: 'asyncapi',
        format: asyncapiFormat,
        fixtures: ['ida-vuelta-2.yaml', 'ida-vuelta-3.yaml', 'pasarela-2.yaml', 'pasarela-3.yaml'],
        sample: sampleOf('Pasarela de Pedidos', MESSAGE, 'pedidos'),
    },
    {
        folder: 'postman',
        format: postmanFormat,
        fixtures: [
            'collection-v1.json',
            'collection-v2.0.json',
            'collection-v2.1.json',
            'environment.json',
            'globals.json',
        ],
        sample: sampleOf('Tienda de Mascotas', REQUEST, 'listaMascotas'),
    },
    {
        folder: 'insomnia',
        format: insomniaFormat,
        fixtures: ['collection-v4.json', 'collection-v5.yaml'],
        sample: sampleOf('Tienda de Mascotas', REQUEST, 'listaMascotas'),
    },
    {
        folder: 'bruno',
        format: brunoFormat,
        fixtures: ['opencollection.yml', 'bruno.json'],
        sample: sampleOf('Tienda de Mascotas', REQUEST, 'listaMascotas'),
    },
    { folder: 'har', format: harFormat, fixtures: ['chrome.har'], sample: null },
    {
        folder: 'mandor',
        format: mandorFormatFor('sync'),
        fixtures: ['async-workspace.mandor.yaml', 'sync-workspace.mandor.yaml'],
        sample: sampleOf('Tienda de Mascotas', REQUEST, 'listaMascotas'),
    },
];

/** The formats that write: each one has a sample the suite writes and reads back. */
export const WRITING_FORMATS = ALL_FORMATS.filter(
    (entry): entry is WritingEntry => entry.sample !== null,
);
