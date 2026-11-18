import type { InteropFile, InteropFormat } from '@mandor/interop-core';
import { failure, success, type Result } from '@mandor/ipc';

/**
 * The first format of the app's list that recognizes the files. The order of the list is the
 * order of the answer, so files two formats could claim go to the one the app named first;
 * files none recognizes are refused, and nothing falls back to a guess.
 */
export function formatOfFiles(
    formats: readonly InteropFormat[],
    files: readonly InteropFile[],
): Result<InteropFormat> {
    const format = formats.find((listed) => listed.sniff(files));

    return format === undefined
        ? failure(
              'import-format-unknown',
              `no listed format recognizes these files (${formats.map(({ id }) => id).join(', ')})`,
          )
        : success(format);
}
