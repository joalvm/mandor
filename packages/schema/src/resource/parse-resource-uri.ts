import { assertKindPart, assertNamePart, assertPathSegment } from './resource-part.js';
import { ResourceUriError } from './resource-uri-error.js';
import { APP_HOST, RESOURCE_URI_SCHEME, SETTINGS_PATH } from './resource-uri-syntax.js';
import type { ResourceUriParts } from './resource-uri.js';

/** Workspace, kind and at least one path segment. Fewer and the URI names no file. */
const WORKSPACE_SEGMENTS = 3;

/**
 * Takes a resource URI apart with the `URL` of the runtime, never with a parser of our own.
 *
 * The order matters. `URL` collapses `..` in silence, so `mandor://r/w/doc/a/../../../out.md`
 * arrives here already rewritten to `mandor://r/out.md`, with nothing left in the text to
 * search for. Validation therefore runs after normalization and counts what survived.
 */
export function parseResourceUri(uri: string): ResourceUriParts {
    const url = urlOf(uri);
    const segments = pathSegmentsOf(url);
    // A host beyond ASCII stays escaped in `URL`: the id it names is the decoded one.
    const repo = decodeOrThrow(url.hostname);

    if (repo === APP_HOST) {
        return appParts(segments);
    }

    assertNamePart(repo, 'repo');

    if (segments.length === 1 && segments[0] === SETTINGS_PATH) {
        return { scope: 'settings', repo };
    }

    return workspaceParts(repo, segments);
}

function urlOf(uri: string): URL {
    if (!uri.startsWith(RESOURCE_URI_SCHEME)) {
        throw new ResourceUriError('scheme', uri);
    }

    const url = parsedOrNull(uri);

    if (url === null) {
        throw new ResourceUriError('scheme', uri);
    }

    if (url.username !== '' || url.password !== '' || url.port !== '') {
        throw new ResourceUriError('repo', uri);
    }

    if (url.search !== '' || url.hash !== '') {
        throw new ResourceUriError('path', uri);
    }

    return url;
}

function parsedOrNull(uri: string): URL | null {
    try {
        return new URL(uri);
    } catch {
        return null;
    }
}

function pathSegmentsOf(url: URL): string[] {
    return url.pathname.replace(/^\//, '').split('/').map(decodedSegment);
}

/** A segment that decoded to a separator would smuggle a level of path past the count above. */
function decodedSegment(segment: string): string {
    const decoded = decodeOrThrow(segment);

    assertPathSegment(decoded);

    return decoded;
}

function decodeOrThrow(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        throw new ResourceUriError('path', segment);
    }
}

function segmentAt(segments: readonly string[], index: number): string {
    return segments[index] ?? '';
}

function appParts(segments: readonly string[]): ResourceUriParts {
    if (segments.length !== 1) {
        throw new ResourceUriError('path', segments.join('/'));
    }

    const name = segmentAt(segments, 0);

    assertNamePart(name, 'path');

    return { scope: 'app', name };
}

function workspaceParts(repo: string, segments: readonly string[]): ResourceUriParts {
    const workspace = segmentAt(segments, 0);
    const kind = segmentAt(segments, 1);
    const path = segments.slice(2);

    assertNamePart(workspace, 'workspace');
    assertKindPart(kind);

    if (segments.length < WORKSPACE_SEGMENTS) {
        throw new ResourceUriError('path', segments.join('/'));
    }

    return { scope: 'workspace', repo, workspace, kind, path: path.join('/') };
}
