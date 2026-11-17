import { FormatInputError } from './format-input-error.js';
import type { InteropFile } from './interop-format.js';

/** The one file of a format that reads one; any other count is an input it does not take. */
export function soleFileOf(files: readonly InteropFile[]): InteropFile {
    const [file] = files;

    if (file === undefined || files.length > 1) {
        throw new FormatInputError([`the format reads one file, not ${String(files.length)}`]);
    }

    return file;
}

/** Lifts a look at one text to a look at the files of a format that reads one. */
export function sniffSoleFile(
    sniffText: (text: string) => boolean,
): (files: readonly InteropFile[]) => boolean {
    return (files) => {
        const [file] = files;

        return file !== undefined && files.length === 1 && sniffText(file.text);
    };
}
