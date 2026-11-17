import { atomicWrite } from '../disk/atomic-write.js';
import { docTextWith } from './doc-text-with.js';
import { docFile } from './doc-path.js';
import { readDoc } from './read-doc.js';

/**
 * Gives a doc a new title and answers with the text it now holds. The title is a line of the
 * front matter, so the file keeps its name, its body and every other key: a tab open on it
 * and the history of the file are untouched by the rename.
 */
export async function retitleDoc(
    root: string,
    workspaceId: string,
    name: string,
    title: string,
): Promise<string> {
    const text = docTextWith(await readDoc(root, workspaceId, name), { title });

    await atomicWrite(docFile(root, workspaceId, name), text);

    return text;
}
