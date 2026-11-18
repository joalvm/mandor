import type {
    InsomniaDocument,
    InsomniaFolder,
    InsomniaRequest,
    InsomniaRow,
    InsomniaWebSocket,
} from '../../../src/insomnia/document/insomnia-tree.js';

const NO_SCRIPTS = { preRequest: '', afterResponse: '' };

/** A row of a header, a parameter or a form, with what it says and nothing else. */
export function rowOf(name: string, value = '', extra: Partial<InsomniaRow> = {}): InsomniaRow {
    return { name, value, disabled: false, type: '', fileName: '', ...extra };
}

/** A request of the tree with what the test names; the rest is what an empty request holds. */
export function requestNode(overrides: Partial<InsomniaRequest> = {}): InsomniaRequest {
    return {
        kind: 'request',
        name: 'Lista',
        method: 'GET',
        url: 'https://api.test/pets',
        description: '',
        headers: [],
        parameters: [],
        pathParameters: [],
        body: undefined,
        authentication: undefined,
        scripts: NO_SCRIPTS,
        settings: {
            followRedirects: 'global',
            encodeUrl: true,
            rebuildPath: true,
            renderRequestBody: true,
            sendCookies: true,
            storeCookies: true,
        },
        ...overrides,
    };
}

/** A WebSocket request of the tree with what the test names. */
export function websocketNode(overrides: Partial<InsomniaWebSocket> = {}): InsomniaWebSocket {
    return {
        kind: 'websocket',
        name: 'Chat',
        url: 'ws://localhost:4010/chat',
        description: '',
        headers: [],
        parameters: [],
        pathParameters: [],
        authentication: undefined,
        ...overrides,
    };
}

export function folderNode(overrides: Partial<InsomniaFolder> = {}): InsomniaFolder {
    return {
        kind: 'folder',
        name: 'Mascotas',
        description: '',
        headers: [],
        authentication: undefined,
        environment: {},
        scripts: NO_SCRIPTS,
        children: [],
        ...overrides,
    };
}

export function documentNode(overrides: Partial<InsomniaDocument> = {}): InsomniaDocument {
    return {
        sourceId: 'workspace:wrk_1',
        name: 'Tienda',
        description: '',
        children: [],
        base: undefined,
        environments: [],
        skipped: [],
        ...overrides,
    };
}
