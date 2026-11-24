import type {
    BrunoBody,
    BrunoDocument,
    BrunoFolder,
    BrunoRequest,
    BrunoRow,
    BrunoWebSocket,
} from '../../../src/bruno/document/bruno-tree.js';

/** A row of a header or a parameter, with what it says and nothing else. */
export function rowOf(name: string, value = '', extra: Partial<BrunoRow> = {}): BrunoRow {
    return { name, value, disabled: false, ...extra };
}

/** A body of the tree with what the test names; the rest is what an empty body holds. */
export function bodyNode(type: string, overrides: Partial<BrunoBody> = {}): BrunoBody {
    return { type, text: '', variables: '', rows: [], file: '', ...overrides };
}

/** A request of the tree with what the test names; the rest is what an empty request holds. */
export function requestNode(overrides: Partial<BrunoRequest> = {}): BrunoRequest {
    return {
        kind: 'request',
        tags: [],
        name: 'Lista',
        seq: 1,
        method: 'GET',
        url: 'https://api.test/pets',
        description: '',
        headers: [],
        params: [],
        pathParams: [],
        settings: {},
        examples: [],
        body: undefined,
        auth: undefined,
        scripts: undefined,
        leftOut: [],
        ...overrides,
    };
}

/** A WebSocket request of the tree with what the test names; the rest is what an empty one holds. */
export function websocketNode(overrides: Partial<BrunoWebSocket> = {}): BrunoWebSocket {
    return {
        kind: 'websocket',
        name: 'Pedidos en vivo',
        seq: 1,
        url: 'wss://api.test/live',
        description: '',
        headers: [],
        auth: undefined,
        messages: [],
        leftOut: [],
        ...overrides,
    };
}

export function folderNode(overrides: Partial<BrunoFolder> = {}): BrunoFolder {
    return {
        kind: 'folder',
        name: 'Mascotas',
        seq: 1,
        description: '',
        headers: [],
        auth: undefined,
        variables: [],
        children: [],
        scripts: undefined,
        leftOut: [],
        ...overrides,
    };
}

export function documentNode(overrides: Partial<BrunoDocument> = {}): BrunoDocument {
    return {
        sourceId: 'collection:abc',
        name: 'Tienda',
        description: '',
        headers: [],
        auth: undefined,
        variables: [],
        children: [],
        environments: [],
        skipped: [],
        scripts: undefined,
        leftOut: [],
        ...overrides,
    };
}
