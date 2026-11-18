import { type Globals, parseGlobals } from '@mandor/schema';

import { documentOf } from '../disk/document-of.js';
import { documentTextWith } from '../disk/document-text.js';
import { fileExists } from '../disk/file-exists.js';
import { FileReadError } from '../disk/file-read-error.js';
import { readDocument } from '../disk/read-document.js';
import { writeDocument } from '../disk/write-document.js';
import { withoutSecretValues } from '../environment/without-secret-values.js';
import { parsedDocument } from '../disk/parsed-document.js';
import { globalsFile } from '../repo/repo-path.js';

/**
 * Writes the globals of an origin in the order they are given. A secret goes to disk with an
 * empty value — the file travels, the value stays on each machine — and so does a name that was
 * secret before. Comments and keys this build does not know survive; a file nobody can read is
 * refused rather than written over.
 */
export async function writeGlobals(root: string, globals: Globals): Promise<void> {
    const valid = parseGlobals(globals);
    const path = globalsFile(root);
    const existing = await readDocument(path, parseGlobals);
    const safe = withoutSecretValues(valid, existing.ok ? existing.value : null);

    if (existing.ok) {
        await writeDocument(path, existing.document, { variables: safe.variables });

        return;
    }

    if (await fileExists(path)) {
        throw new FileReadError(existing.warning);
    }

    await writeDocument(path, documentOf({ variables: safe.variables }), {});
}

/**
 * The text `globals` make of the text a window had, `null` when it had no file: what a guarded
 * write merges against what is on disk now. Secret values stay off it, as on a write.
 */
export function globalsTextWith(base: string | null, globals: Globals): string {
    const valid = parseGlobals(globals);

    if (base === null) {
        return documentTextWith(documentOf({}), {
            variables: withoutSecretValues(valid, null).variables,
        });
    }

    const document = parsedDocument(base);
    const previous = parseGlobals(document.toJS());

    return documentTextWith(document, {
        variables: withoutSecretValues(valid, previous).variables,
    });
}
