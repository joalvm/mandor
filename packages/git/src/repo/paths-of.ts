/** The paths of a `-z` listing of git, relative to the root and with forward slashes. */
export function pathsOf(listing: string): string[] {
    return listing
        .split('\0')
        .filter((path) => path !== '')
        .map((path) => path.replaceAll('\\', '/'));
}
