import type { InteropFile } from '@mandor/interop-core';

/** A file the user dropped, read in the renderer: the browser hands the bytes over. */
export async function readDroppedFile(file: File, path: string): Promise<InteropFile> {
    return { path, text: await file.text() };
}
