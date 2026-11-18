import { readFileText } from '../disk/read-file-text.js';
import { docFile } from './doc-path.js';

/**
 * The text of one doc, exactly as it sits on disk. Markdown is not a document Mandor parses:
 * it belongs to whoever wrote the repo, and it reaches the viewer without being rewritten.
 *
 * Async so that a name the path refuses arrives as a rejection like any other failure of the
 * read, and not as a throw the caller has to guard separately.
 */
export async function readDoc(root: string, workspaceId: string, name: string): Promise<string> {
    return readFileText(docFile(root, workspaceId, name));
}
