import type { Document } from 'yaml';

import { atomicWrite } from './atomic-write.js';
import { documentTextWith } from './document-text.js';

/** Writes the document with `changes` in it: see `documentTextWith` for what survives. */
export async function writeDocument(
    path: string,
    document: Document,
    changes: Record<string, unknown>,
): Promise<void> {
    await atomicWrite(path, documentTextWith(document, changes));
}
