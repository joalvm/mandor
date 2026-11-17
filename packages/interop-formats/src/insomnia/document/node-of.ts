import type {
    InsomniaBody,
    InsomniaEnvironment,
    InsomniaFolder,
    InsomniaNode,
    InsomniaRequest,
    InsomniaRequestSettings,
    InsomniaRow,
    InsomniaScripts,
    InsomniaWebSocket,
} from './insomnia-tree.js';
import type { InsomniaNodeParts } from './insomnia-v4-schema.js';

type Row = NonNullable<InsomniaNodeParts['headers']>[number];
type Body = NonNullable<InsomniaNodeParts['body']>;
type Settings = NonNullable<InsomniaNodeParts['settings']>;

const NO_SETTINGS: Settings = {};

function rowOf(row: Row): InsomniaRow {
    return {
        name: row.name ?? '',
        value: row.value ?? '',
        disabled: row.disabled === true,
        type: row.type ?? '',
        fileName: row.fileName ?? '',
    };
}

function rowsOf(rows: readonly Row[] | null | undefined): InsomniaRow[] {
    return (rows ?? []).map(rowOf);
}

function bodyOf(body: Body | null | undefined): InsomniaBody | undefined {
    if (body === null || body === undefined) {
        return undefined;
    }

    return {
        mimeType: body.mimeType ?? '',
        text: body.text ?? '',
        fileName: body.fileName ?? '',
        params: rowsOf(body.params),
    };
}

function scriptsOf(parts: InsomniaNodeParts): InsomniaScripts {
    return {
        preRequest: parts.scripts?.preRequest ?? '',
        afterResponse: parts.scripts?.afterResponse ?? '',
    };
}

/** Each switch is on unless it is written off: that is what Insomnia does with one it misses. */
function settingsOf(parts: InsomniaNodeParts): InsomniaRequestSettings {
    const { followRedirects, encodeUrl, rebuildPath, renderRequestBody, cookies } =
        parts.settings ?? NO_SETTINGS;

    return {
        followRedirects: followRedirects ?? 'global',
        encodeUrl: encodeUrl !== false,
        rebuildPath: rebuildPath !== false,
        renderRequestBody: renderRequestBody !== false,
        sendCookies: cookies?.send !== false,
        storeCookies: cookies?.store !== false,
    };
}

/** A request of the tree, from the parts both layouts write and the description each keeps apart. */
export function requestOf(parts: InsomniaNodeParts, description: string): InsomniaRequest {
    return {
        kind: 'request',
        name: parts.name ?? '',
        method: parts.method ?? 'GET',
        url: parts.url ?? '',
        description,
        headers: rowsOf(parts.headers),
        parameters: rowsOf(parts.parameters),
        pathParameters: rowsOf(parts.pathParameters),
        body: bodyOf(parts.body),
        authentication: parts.authentication ?? undefined,
        scripts: scriptsOf(parts),
        settings: settingsOf(parts),
    };
}

/** A WebSocket request of the tree: the parts a request shares, minus the method and the body. */
export function websocketOf(parts: InsomniaNodeParts, description: string): InsomniaWebSocket {
    return {
        kind: 'websocket',
        name: parts.name ?? '',
        url: parts.url ?? '',
        description,
        headers: rowsOf(parts.headers),
        parameters: rowsOf(parts.parameters),
        pathParameters: rowsOf(parts.pathParameters),
        authentication: parts.authentication ?? undefined,
    };
}

/** A folder of the tree, with the children the layout has already read. */
export function folderOf(
    parts: InsomniaNodeParts,
    description: string,
    children: InsomniaNode[],
): InsomniaFolder {
    return {
        kind: 'folder',
        name: parts.name ?? '',
        description,
        headers: rowsOf(parts.headers),
        authentication: parts.authentication ?? undefined,
        environment: parts.environment ?? {},
        scripts: scriptsOf(parts),
        children,
    };
}

/** The variables of an environment, from the free JSON Insomnia keeps them in. */
export function environmentOf(
    name: string | null | undefined,
    data: Record<string, unknown> | null | undefined,
): InsomniaEnvironment {
    return { name: name ?? '', data: data ?? {} };
}
