import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { InteropFile } from '@mandor/interop-core';

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url));

/** The text of a file in `tests/bruno/fixtures`, as the user would drop it. */
export function fixtureText(name: string): string {
    return readFileSync(join(FIXTURES, name), 'utf8');
}

/** The files of a folder of `tests/bruno/fixtures`, as the host reads a picked folder. */
export function folderFiles(folder: string): InteropFile[] {
    const root = join(FIXTURES, folder);

    return readdirSync(root, { recursive: true, encoding: 'utf8' })
        .map((path) => path.replaceAll('\\', '/'))
        .filter((path) => statSync(join(root, path)).isFile())
        .sort()
        .map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }));
}

/** The files of a folder, with the ones that match any of the paths taken out. */
export function folderFilesWithout(folder: string, ...paths: string[]): InteropFile[] {
    return folderFiles(folder).filter((file) => !paths.includes(file.path));
}

/** The files of a folder, moved under a directory: a collection kept inside a bigger folder. */
export function folderFilesUnder(folder: string, dir: string): InteropFile[] {
    return folderFiles(folder).map((file) => ({ path: `${dir}/${file.path}`, text: file.text }));
}
