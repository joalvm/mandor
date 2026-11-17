import type { InteropFile, InteropFormat, InteropRead, InteropScope } from '@mandor/interop-core';

/** How main reads the files of an import with the format that recognized them. */
export type ReadImport = (
    format: InteropFormat,
    files: readonly InteropFile[],
    scope: InteropScope,
    /** Ends the read when the person stops it. */
    signal?: AbortSignal,
) => Promise<InteropRead>;

/**
 * The read in the thread that calls it: the format loads its parser and reads. What the worker
 * of an import runs, and what a test runs without one.
 */
export async function readInThread(
    format: InteropFormat,
    files: readonly InteropFile[],
    scope: InteropScope,
): Promise<InteropRead> {
    const codec = await format.load();

    return codec.read(files, scope);
}
