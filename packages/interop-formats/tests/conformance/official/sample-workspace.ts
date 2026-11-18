import type { WorkspaceCollectionSource, WorkspaceData } from '@mandor/interop-core';
import type {
    AuthConfig,
    CollectionItem,
    Connection,
    RequestBody,
    RequestExample,
} from '@mandor/schema';

const LINE = { key: 'x-a', value: '1', enabled: true };

const BODIES: readonly RequestBody[] = [
    { type: 'none' },
    { type: 'json', content: '{"a":"{{b}}"}' },
    { type: 'text', content: 'hola' },
    { type: 'xml', content: '<a/>' },
    { type: 'urlencoded', fields: [LINE] },
    {
        type: 'form',
        fields: [
            { ...LINE, kind: 'text' },
            { key: 'f', value: 'files/a.png', enabled: true, kind: 'file' },
        ],
    },
    { type: 'binary', file: 'files/a.png' },
    { type: 'graphql', query: '{ a }', variables: '{"b":1}', operationName: 'A' },
];

const AUTHS: readonly AuthConfig[] = [
    { inherit: true },
    { type: 'none' },
    { type: 'basic', username: 'u', password: '{{p}}' },
    { type: 'bearer', token: '{{t}}', prefix: 'Token' },
    { type: 'apikey', name: 'x-key', value: 'v', in: 'header' },
    { type: 'apikey', name: 'key', value: 'v', in: 'query' },
    { type: 'digest', username: 'u', password: 'p' },
    {
        type: 'awsv4',
        accessKeyId: 'a',
        secretAccessKey: 's',
        region: 'eu',
        service: 'x',
        sessionToken: 't',
    },
    {
        type: 'oauth2-client-credentials',
        tokenUrl: 'https://auth.test/token',
        clientId: 'c',
        clientSecret: 's',
        clientAuth: 'body',
        scope: 'a b',
        audience: 'x',
    },
    {
        type: 'oauth2-code-pkce',
        authorizationUrl: 'https://auth.test/authorize',
        tokenUrl: 'https://auth.test/token',
        clientId: 'c',
        clientSecret: 's',
        scope: 'a',
        redirectPort: 3000,
    },
];

const EXAMPLE: RequestExample = {
    name: 'Creado',
    status: '201',
    contentType: 'application/json',
    body: '{"a":1}',
    headers: [['x-trace', '1']],
    cookies: [
        {
            name: 'sid',
            value: '1',
            path: '/',
            domain: 'api.test',
            sameSite: 'lax',
            httpOnly: true,
            secure: true,
        },
    ],
    request: {
        query: [LINE],
        headers: [LINE],
        body: { type: 'json', content: '{}' },
        description: 'Con todo',
    },
};

function requestOf(name: string, body: Record<string, unknown> = {}): CollectionItem {
    return {
        kind: 'request',
        name,
        tags: ['una'],
        body: { method: 'POST', url: 'https://api.test/:id?q=1', ...body },
    };
}

const BY_BODY = BODIES.map((body) => requestOf(`cuerpo ${body.type}`, { body }));
const BY_AUTH = AUTHS.map((auth, index) => requestOf(`auth ${String(index)}`, { auth }));

const FULL = requestOf('completo', {
    description: 'Un request con todo',
    headers: [LINE, { ...LINE, key: 'x-off', enabled: false, description: 'Apagada' }],
    query: [LINE],
    pathParams: [{ key: 'id', value: '7', enabled: true }],
    body: { type: 'json', content: '{}' },
    examples: [EXAMPLE, { ...EXAMPLE, name: 'Mal', status: '500', cookies: [], headers: [] }],
    scripts: { pre: 'a()', post: 'b()', dialect: 'postman' },
    settings: {
        followRedirects: false,
        maxRedirects: 3,
        validateTls: false,
        keepMethodOnRedirect: true,
        useCookieJar: false,
        httpVersion: 'http2',
        followAuthorizationOnRedirect: true,
        tlsCiphers: 'A:B',
        tlsMinVersion: 'TLSv1.2',
        timeoutMs: 100,
    },
});

const MESSAGE: CollectionItem = {
    kind: 'message',
    name: 'saludo',
    tags: [],
    body: { channel: 'c', direction: 'outgoing', payload: '{"a":1}', payloadType: 'json' },
};

const COLLECTION: WorkspaceCollectionSource = {
    name: 'API',
    settings: {
        description: 'La colección',
        variables: [
            { name: 'a', value: '1', enabled: true, secret: false },
            { name: 'b', value: 'x', enabled: false, secret: true },
        ],
        headers: [LINE],
        auth: { type: 'bearer', token: '{{t}}' },
    },
    folders: [
        {
            name: 'Carpeta',
            settings: {
                description: 'Una carpeta',
                variables: [{ name: 'c', value: '1', enabled: true, secret: false }],
                headers: [LINE],
                auth: { type: 'basic', username: 'u', password: 'p' },
            },
            folders: [
                {
                    name: 'Honda',
                    settings: { variables: [], headers: [] },
                    folders: [],
                    items: BY_AUTH,
                },
            ],
            items: BY_BODY,
        },
    ],
    items: [FULL, MESSAGE],
};

const WEBSOCKET: Connection = {
    id: 'lobby',
    name: 'Lobby',
    transport: 'websocket',
    url: 'wss://api.test/lobby',
    headers: [LINE],
    params: [LINE],
    environmentId: null,
    description: 'La sala',
    websocket: { subprotocols: ['chat'] },
    auth: { type: 'bearer', token: 't' },
};

const SOCKET_IO: Connection = {
    id: 'events',
    name: 'Eventos',
    transport: 'socketio',
    url: 'https://api.test',
    headers: [LINE],
    environmentId: null,
};

/** A workspace with a little of every thing each format has a place for. */
export const OFFICIAL_SAMPLE: WorkspaceData = {
    name: 'Tienda',
    connections: [WEBSOCKET, SOCKET_IO],
    environments: [
        {
            id: 'prod',
            name: 'Prod',
            variables: [
                { name: 'a', value: 'x', enabled: true, secret: false },
                { name: 't', value: 'oculto', enabled: true, secret: true },
                { name: 'off', value: 'y', enabled: false, secret: false },
            ],
        },
    ],
    globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
    auth: { type: 'bearer', token: '{{t}}' },
    docs: [{ name: 'leeme.md', title: 'Leeme', text: '# Tienda' }],
    collections: [COLLECTION],
};
