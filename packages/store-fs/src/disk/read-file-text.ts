import { open } from 'node:fs/promises';

import { withOpenFileSlot } from './open-file-slot.js';

/**
 * Bytes past which a file of the repo is not read. Parsing holds a file many times over in
 * memory, and main is one process for every window: a file of gigabytes that a pull brought in
 * must cost that file and not the app. No body pasted by hand gets near it.
 */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;

/**
 * The text of a file, exactly as it sits on disk. Its size is asked of the same handle the text
 * is read from, so a file swapped in between cannot pass with the size of the one before.
 */
export function readFileText(path: string): Promise<string> {
    return withOpenFileSlot(() => textOf(path));
}

async function textOf(path: string): Promise<string> {
    const handle = await open(path, 'r');

    try {
        const { size } = await handle.stat();

        if (size > MAX_FILE_BYTES) {
            throw new Error(`${String(size)} bytes, past the 64 MiB a file may have to be read`);
        }

        return await handle.readFile('utf8');
    } finally {
        await handle.close();
    }
}
