import { assertKindPart, assertNamePart, resourcePathSegments } from './resource-part.js';
import { APP_HOST, RESOURCE_URI_SCHEME, SETTINGS_PATH } from './resource-uri-syntax.js';
import type { ResourceUri, ResourceUriParts } from './resource-uri.js';

/**
 * Writes the canonical text of a resource, validating every part on the way. It is the only
 * place a resource URI is born, so anything holding one holds something Mandor can open, and
 * two views of the same resource compare equal with `===`.
 */
export function formatResourceUri(parts: ResourceUriParts): ResourceUri {
    return uriBy(parts.scope, parts);
}

type PartsOf<Scope extends ResourceUriParts['scope']> = Extract<ResourceUriParts, { scope: Scope }>;

/** One writer per scope, chosen by the scope the parts carry. */
const URI_OF_SCOPE: {
    [Scope in ResourceUriParts['scope']]: (parts: PartsOf<Scope>) => ResourceUri;
} = {
    app: appUri,
    settings: settingsUri,
    workspace: workspaceUri,
};

/** The scope and the parts travel apart, so the compiler pairs the writer with its own parts. */
function uriBy<Scope extends ResourceUriParts['scope']>(
    scope: Scope,
    parts: PartsOf<Scope>,
): ResourceUri {
    return URI_OF_SCOPE[scope](parts);
}

function appUri(parts: PartsOf<'app'>): ResourceUri {
    assertNamePart(parts.name, 'path');

    return `${RESOURCE_URI_SCHEME}${APP_HOST}/${encodeURIComponent(parts.name)}`;
}

function settingsUri(parts: PartsOf<'settings'>): ResourceUri {
    assertNamePart(parts.repo, 'repo');

    return `${RESOURCE_URI_SCHEME}${encodeURIComponent(parts.repo)}/${SETTINGS_PATH}`;
}

function workspaceUri(parts: PartsOf<'workspace'>): ResourceUri {
    const kind: string = parts.kind;

    assertNamePart(parts.repo, 'repo');
    assertNamePart(parts.workspace, 'workspace');
    assertKindPart(kind);

    const path = resourcePathSegments(parts.path).map(encodeURIComponent).join('/');
    const place = [parts.repo, parts.workspace].map(encodeURIComponent).join('/');

    return `${RESOURCE_URI_SCHEME}${place}/${kind}/${path}`;
}
