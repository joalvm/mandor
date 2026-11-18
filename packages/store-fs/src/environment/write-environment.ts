import { mkdir } from 'node:fs/promises';

import { type Environment, parseEnvironment } from '@mandor/schema';

import { documentOf } from '../disk/document-of.js';
import { fileExists } from '../disk/file-exists.js';
import { FileReadError } from '../disk/file-read-error.js';
import { readDocument } from '../disk/read-document.js';
import { writeDocument } from '../disk/write-document.js';
import { environmentFile, environmentsDir } from './environment-path.js';
import { keepSecrets, type SecretKeeper } from './secret-keeper.js';
import { withoutSecretValues } from './without-secret-values.js';

/**
 * Writes one environment to its file, named after its id. An environment that was already there
 * is edited inside its own document, so comments, key order and the keys this app does not
 * understand survive the rewrite. The values of the secret variables never reach the file: they
 * go to the keeper first, and only then is anything written.
 */
export async function writeEnvironment(
    root: string,
    workspaceId: string,
    environment: Environment,
    keep?: SecretKeeper,
): Promise<void> {
    const valid = parseEnvironment(environment);
    const path = environmentFile(root, workspaceId, valid.id);
    const existing = await readDocument(path, parseEnvironment);
    const safe = withoutSecretValues(valid, existing.ok ? existing.value : null);

    await keepSecrets(keep, valid);

    if (existing.ok) {
        await writeDocument(path, existing.document, { ...safe });

        return;
    }

    if (await fileExists(path)) {
        throw new FileReadError(existing.warning);
    }

    await mkdir(environmentsDir(root, workspaceId), { recursive: true });
    await writeDocument(path, documentOf(safe), {});
}
