import { isDocName } from '@mandor/schema';

import { entriesOrNone } from '../disk/directory-entries.js';
import { titleOfDoc } from './doc-parts.js';
import { docsDir } from './doc-path.js';
import { readDoc } from './read-doc.js';

/** One doc as the list shows it: the file it is stored in and the title a person reads. */
type ListedDoc = { name: string; title: string };

/**
 * A doc that cannot be read stays in the list, with no title: the others are still there to read,
 * and opening it is what tells why it does not open.
 */
async function listed(root: string, workspaceId: string, name: string): Promise<ListedDoc> {
    try {
        return { name, title: titleOfDoc(await readDoc(root, workspaceId, name), name) };
    } catch {
        return { name, title: '' };
    }
}

function byTitle(one: ListedDoc, other: ListedDoc): number {
    return one.title.localeCompare(other.title) || one.name.localeCompare(other.name);
}

/**
 * The docs of a workspace, by title and then by file name. The list is flat on purpose: the tree
 * of the collection is another feature, and a folder here would have to be undone to get it.
 *
 * What the list holds is what can be opened, so anything the reader would refuse —a directory
 * ending in `.md`, a name with a separator in it— is left out here and not at the click.
 */
export async function listDocs(root: string, workspaceId: string): Promise<ListedDoc[]> {
    const entries = await entriesOrNone(docsDir(root, workspaceId));
    const names = entries.filter((entry) => entry.isFile() && isDocName(entry.name));
    const docs = await Promise.all(names.map((entry) => listed(root, workspaceId, entry.name)));

    return docs.toSorted(byTitle);
}
