import { readTextOrNull } from '../disk/read-text.js';
import { docTextWith } from './doc-text-with.js';
import { docFile } from './doc-path.js';
import { replaceDoc } from './replace-doc.js';

/**
 * Writes the body of one doc under the front matter it already has: the editor never sees the
 * title, so what it sends back cannot carry it, and a save must not lose it. Nothing in the app
 * asks to save, so the first keystroke on a workspace that never had docs is what has to make
 * the folder that holds them.
 */
export async function writeDoc(
    root: string,
    workspaceId: string,
    name: string,
    text: string,
): Promise<void> {
    const current = await readTextOrNull(docFile(root, workspaceId, name));

    await replaceDoc(root, workspaceId, name, docTextWith(current ?? '', { body: text }));
}
