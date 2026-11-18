import { type ChangedEntity, isDocName, SEGMENT } from '@mandor/schema';

import {
    COLLECTION_DEFINITION_FILE,
    COLLECTION_EXTENSION,
    COLLECTIONS_FILE,
    FOLDER_FILE,
} from '../collection/collection-path.js';
import { globalsFile, repoFile, workspacesDir } from './repo-path.js';

const SEPARATOR = '/';
const WORKSPACE_FILE = 'workspace.yaml';
const YAML = '.yaml';
/** The files that speak for the directory they sit in: a collection's, and a folder's. */
const DIRECTORY_FILES = [COLLECTION_DEFINITION_FILE, FOLDER_FILE];

/** The folder names, as `repo-path.ts`, `collection-path.ts` and the others spell them. */
const REPO_FILE = repoFile('');
const GLOBALS = globalsFile('');
const WORKSPACES = workspacesDir('');

function isSegment(value: string | undefined): value is string {
    return value !== undefined && SEGMENT.test(value);
}

function idOfYaml(name: string | undefined): string | undefined {
    const id = name?.endsWith(YAML) === true ? name.slice(0, -YAML.length) : undefined;

    return isSegment(id) ? id : undefined;
}

function inCollection(workspaceId: string, rest: string[]): ChangedEntity | null {
    const last = rest.at(-1) ?? '';

    if (rest.length === 1 && last === COLLECTIONS_FILE) {
        return { area: 'collections', workspaceId, path: '' };
    }

    const folder = DIRECTORY_FILES.includes(last) ? rest.slice(0, -1) : undefined;
    const item = last.endsWith(COLLECTION_EXTENSION)
        ? [...rest.slice(0, -1), last.slice(0, -COLLECTION_EXTENSION.length)]
        : undefined;
    const segments = folder ?? item ?? [];

    return segments.length > 0 && segments.every((each) => SEGMENT.test(each))
        ? { area: 'collections', workspaceId, path: segments.join(SEPARATOR) }
        : null;
}

function inDocs(workspaceId: string, tail: string[]): ChangedEntity | null {
    const name = tail.length === 1 ? tail[0] : undefined;

    return name !== undefined && isDocName(name) ? { area: 'doc', workspaceId, name } : null;
}

/** An environment or a connection: one yaml file named by its id, directly in its folder. */
function inYamlFolder(
    area: 'environment' | 'connection',
    workspaceId: string,
    tail: string[],
): ChangedEntity | null {
    const id = tail.length === 1 ? idOfYaml(tail[0]) : undefined;

    return id === undefined ? null : { area, workspaceId, id };
}

type EntityIn = (workspaceId: string, tail: string[]) => ChangedEntity | null;

/**
 * What each name directly inside a workspace holds. A map and not an object: the name comes
 * from a path on disk, and `constructor` must find nothing rather than the prototype.
 */
const ENTITY_IN_FOLDER: ReadonlyMap<string, EntityIn> = new Map<string, EntityIn>([
    [
        WORKSPACE_FILE,
        (workspaceId, tail) => (tail.length === 0 ? { area: 'workspace', workspaceId } : null),
    ],
    ['collections', inCollection],
    ['docs', inDocs],
    ['environments', (workspaceId, tail) => inYamlFolder('environment', workspaceId, tail)],
    ['connections', (workspaceId, tail) => inYamlFolder('connection', workspaceId, tail)],
]);

function inWorkspace(workspaceId: string, rest: string[]): ChangedEntity | null {
    const [folder = '', ...tail] = rest;
    const entityIn = ENTITY_IN_FOLDER.get(folder);

    return entityIn === undefined ? null : entityIn(workspaceId, tail);
}

/**
 * What a file of the repo is, in the words of the window: the item, the doc, the environment…
 * `path` is relative to the root with forward slashes, the way git and the watcher name it.
 * A file that is no entity (a body, a cookie jar, something the user dropped there) is `null`.
 */
export function entityOfPath(path: string): ChangedEntity | null {
    const [first, workspaceId, ...rest] = path.split(SEPARATOR);

    if (path === REPO_FILE) {
        return { area: 'repo' };
    }

    if (path === GLOBALS) {
        return { area: 'globals' };
    }

    return first === WORKSPACES && isSegment(workspaceId) ? inWorkspace(workspaceId, rest) : null;
}
