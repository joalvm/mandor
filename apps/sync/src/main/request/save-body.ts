import { copyFile, writeFile } from 'node:fs/promises';

import type { ChooseSavePath } from '@mandor/host';
import { failure, success, type RequestBodySaveRequest, type Result } from '@mandor/ipc';
import { bodyFile } from '@mandor/store-fs';

import { decodedBytes } from './response-of.js';

/**
 * Saves a body where the user picks. The user asked for these bytes as they arrived, so they
 * are not redacted: they may be a file, and a marker inside it would corrupt it.
 * `null` is the dialog closed, which is an answer.
 */
export async function saveBody(
    root: string,
    choose: ChooseSavePath,
    input: RequestBodySaveRequest,
): Promise<Result<{ path: string | null }>> {
    const path = await choose(input.suggestedName);

    if (path === null) {
        return success({ path: null });
    }

    try {
        if ('ref' in input) {
            await copyFile(bodyFile(root, input.ref), path);
        } else {
            // The window still holds the body; a stored one is copied instead.
            await writeFile(path, decodedBytes(input));
        }
    } catch {
        return failure('request-file', 'the body could not be saved');
    }

    return success({ path });
}
