import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

import type { CollectionSearchHit } from '@mandor/ipc';
import { formatResourceUri } from '@mandor/schema';
import { collectionFilePlace, docParts, workspaceDir } from '@mandor/store-fs';

const MAX_FILE_BYTES = 1024 * 1024;
/** Lines past this many are not worth the wire: a query that broad is narrowed by typing on. */
const MAX_HITS = 500;
/** Files read at once: enough to keep the disk busy, few enough to hold little in memory. */
const READ_BATCH = 16;
const SEARCHED_EXTENSIONS = new Set(['.md', '.yaml', '.yml']);

/**
 * The text of a file a query is held against, by what the file is. A doc shows the window its
 * body and not the front matter that carries its title, so the lines are counted in the body: a
 * hit has to land on the line the editor draws.
 */
const SEARCHED_TEXT: Record<CollectionSearchHit['source'], (text: string) => string> = {
    doc: (text) => docParts(text).body,
    folder: (text) => text,
    item: (text) => text,
};

/**
 * The lines of the docs and items of a workspace that hold the query. The files are read a few
 * at a time and the search stops once it has enough lines, so a workspace of thousands of files
 * neither opens them all at once nor sends every line of them to the window.
 */
export async function searchWorkspaceContent(
    root: string,
    request: { repo: string; workspaceId: string; query: string; signal?: AbortSignal },
): Promise<CollectionSearchHit[]> {
    const base = workspaceDir(root, request.workspaceId);
    const files = await searchableFiles(base, request.signal);
    const hits: CollectionSearchHit[] = [];

    for (let start = 0; start < files.length && hits.length < MAX_HITS; start += READ_BATCH) {
        const batch = files.slice(start, start + READ_BATCH);
        const found = await Promise.all(
            batch.map((file) => hitsInFile({ base, file, ...request })),
        );

        hits.push(...found.flat());
    }

    return hits.slice(0, MAX_HITS);
}

async function searchableFiles(directory: string, signal?: AbortSignal): Promise<string[]> {
    signal?.throwIfAborted();
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        signal?.throwIfAborted();

        if (entry.name === '.mandor') {
            continue;
        }

        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...(await searchableFiles(path, signal)));

            continue;
        }

        // A link is not followed: a repo that came from elsewhere could point one at any file
        // of this machine.
        if (entry.isFile() && SEARCHED_EXTENSIONS.has(extname(entry.name))) {
            files.push(path);
        }
    }

    return files;
}

type SearchFile = {
    base: string;
    file: string;
    repo: string;
    workspaceId: string;
    query: string;
    signal?: AbortSignal;
};

async function hitsInFile(search: SearchFile): Promise<CollectionSearchHit[]> {
    const place = resourcePlace(search.base, search.file);
    const query = search.query.toLocaleLowerCase();

    search.signal?.throwIfAborted();

    // Only what the window can open is read, and only when it is small enough to be a note.
    if (place === null || (await stat(search.file)).size > MAX_FILE_BYTES) {
        return [];
    }

    const text = SEARCHED_TEXT[place.source](await readFile(search.file, 'utf8'));

    return text.split(/\r?\n/u).flatMap((line, index) => {
        if (!line.toLocaleLowerCase().includes(query)) {
            return [];
        }

        const resource = formatResourceUri({
            scope: 'workspace',
            repo: search.repo,
            workspace: search.workspaceId,
            kind: place.source,
            path: place.path,
        });

        return [{ line: index + 1, resource, source: place.source }];
    });
}

/** Where a file stands in the workspace, for the resource a hit names: its path never travels. */
type Place = { path: string; source: CollectionSearchHit['source'] };

function resourcePlace(base: string, file: string): Place | null {
    const path = relative(base, file).split(sep).join('/');

    if (path.startsWith('docs/') && path.endsWith('.md')) {
        return { path: path.slice(5), source: 'doc' };
    }

    if (!path.startsWith('collections/')) {
        return null;
    }

    const place = collectionFilePlace(path.slice(12));

    return place === null ? null : { path: place.path, source: place.kind };
}
