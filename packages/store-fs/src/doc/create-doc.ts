import { mkdir, open } from 'node:fs/promises';

import { writeRefusal } from '../disk/write-refusal.js';
import { docTextWith } from './doc-text-with.js';
import { docFile, docsDir } from './doc-path.js';

/** What the caller chose before the doc existed: the file it is stored in, and its title. */
type NewDoc = { name: string; title: string };

/**
 * Makes one doc with its title and nothing else. The body is born empty because the editor is
 * what fills it: a new note that arrived with a heading already written would be a heading
 * nobody chose, and deleting it is the first thing its author would have to do.
 *
 * It opens the file instead of writing it through the atomic path, and the two reasons are one:
 * a creation that has to fail when the name is taken cannot arrive by a rename over whatever is
 * there, and a file born with a single short block has no text a crash could truncate.
 *
 * The exclusive flag is what refuses, not a look before the write: between a look and a write
 * another window can create the same name, and the answer to that has to be the same refusal.
 */
export async function createDoc(root: string, workspaceId: string, doc: NewDoc): Promise<void> {
    const { name, title } = doc;
    const path = docFile(root, workspaceId, name);

    await mkdir(docsDir(root, workspaceId), { recursive: true });

    try {
        const handle = await open(path, 'wx');

        try {
            await handle.write(docTextWith('', { title }));
        } finally {
            await handle.close();
        }
    } catch (error) {
        throw writeRefusal(error, name);
    }
}
