/** The last name of a path, the file or the directory it ends in. */
export function baseNameOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
}

/** The names of the directories a path goes through, outermost first. */
export function dirNamesOf(path: string): string[] {
    return path
        .slice(0, path.length - baseNameOf(path).length)
        .split('/')
        .filter((name) => name !== '');
}

/** The name a file goes by when it names nothing: its own, without the extension. */
export function stemOf(path: string): string {
    return baseNameOf(path).replace(/\.[^.]*$/u, '');
}
