import { documentRootOf, type InteropFile } from '@mandor/interop-core';

/** The two layouts Bruno keeps a collection in: OpenCollection (YAML) and the `.bru` files. */
export type BrunoLayout = 'opencollection' | 'bru';

/** A directory that is the root of a collection, and the layout it is written in. */
export type BrunoRoot = { dir: string; layout: BrunoLayout };

/** What each root file must hold to be the one of its layout and not a file that shares the name. */
const ROOT_FILES = new Map<string, { layout: BrunoLayout; isRoot: (text: string) => boolean }>([
    [
        'opencollection.yml',
        {
            layout: 'opencollection',
            isRoot: (text) => documentRootOf(text)?.['opencollection'] !== undefined,
        },
    ],
    [
        'bruno.json',
        {
            layout: 'bru',
            isRoot: (text) => typeof documentRootOf(text)?.['name'] === 'string',
        },
    ],
]);

function partsOf(path: string): { dir: string; base: string } {
    const cut = path.lastIndexOf('/');

    return { dir: cut < 0 ? '' : path.slice(0, cut), base: path.slice(cut + 1) };
}

/**
 * The collections the files hold, told by their root file and never by the extensions: a
 * directory is a collection when it keeps an `opencollection.yml` that says so or a
 * `bruno.json`. When it keeps both, OpenCollection is the layout.
 */
export function brunoRootsOf(files: readonly InteropFile[]): BrunoRoot[] {
    const roots = new Map<string, BrunoRoot>();

    for (const file of files) {
        const { dir, base } = partsOf(file.path);
        const root = ROOT_FILES.get(base);

        if (root?.isRoot(file.text) === true && roots.get(dir)?.layout !== 'opencollection') {
            roots.set(dir, { dir, layout: root.layout });
        }
    }

    return [...roots.values()].toSorted((first, second) => first.dir.localeCompare(second.dir));
}

/** Whether the files hold at least one collection of Bruno. */
export function looksLikeBrunoFiles(files: readonly InteropFile[]): boolean {
    return brunoRootsOf(files).length > 0;
}

/** The deepest root a file sits under: a collection kept inside another one is its own. */
function ownerOf(path: string, roots: readonly BrunoRoot[]): BrunoRoot | undefined {
    return roots
        .filter((root) => root.dir === '' || path.startsWith(`${root.dir}/`))
        .toSorted((first, second) => second.dir.length - first.dir.length)[0];
}

/** The files of one collection, with their paths relative to its root. */
export function filesOfRoot(
    files: readonly InteropFile[],
    root: BrunoRoot,
    roots: readonly BrunoRoot[],
): InteropFile[] {
    const prefix = root.dir === '' ? '' : `${root.dir}/`;

    return files
        .filter((file) => ownerOf(file.path, roots)?.dir === root.dir)
        .map((file) => ({ path: file.path.slice(prefix.length), text: file.text }));
}
