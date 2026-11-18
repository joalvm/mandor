import type { InteropFormat } from '@mandor/interop-core';
import type { FileFilter } from 'electron';
import { extname } from 'node:path';

/** What the open dialog offers: every file a listed format reads, under the name of its format. */
export function openFiltersOf(formats: readonly InteropFormat[]): FileFilter[] {
    return formats.map((format) => ({ name: format.label, extensions: [...format.reads] }));
}

/**
 * What the save dialog offers for the name the renderer suggested: the format that writes its
 * extension, or every format the app writes when the name carries none of theirs.
 */
export function saveFiltersOf(
    formats: readonly InteropFormat[],
    suggestedName: string,
): FileFilter[] {
    const extension = extname(suggestedName).slice(1);
    const named = formats.filter((format) => format.writes.includes(extension));

    return (named.length > 0 ? named : formats).map((format) => ({
        name: format.label,
        extensions: [...format.writes],
    }));
}
