import { open } from 'node:fs/promises';

import {
    failure,
    success,
    type BodyWindow,
    type RequestBodyReadRequest,
    type Result,
} from '@mandor/ipc';
import { bodyFile } from '@mandor/store-fs';

import { encodingOf } from './response-of.js';

/**
 * One window of a body that went to disk. The reference is a hash and `bodyFile` accepts
 * nothing else, so the renderer cannot make main open a file the app did not write.
 */
export async function readBodyWindow(
    root: string,
    input: RequestBodyReadRequest,
): Promise<Result<BodyWindow>> {
    let handle;

    try {
        handle = await open(bodyFile(root, input.ref), 'r');
    } catch {
        return failure('request-file', 'the body is not on disk anymore');
    }

    try {
        const { size } = await handle.stat();
        const buffer = Buffer.alloc(Math.max(0, Math.min(input.length, size - input.offset)));
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, input.offset);

        return success({ ...encodingOf(buffer.subarray(0, bytesRead)), total: size });
    } finally {
        await handle.close();
    }
}
