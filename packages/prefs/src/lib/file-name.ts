/**
 * The name of a file without the folders above it, whichever separator the system wrote: the
 * settings show which file, and the folders of this machine are nobody's business on screen.
 */
export function fileName(path: string): string {
    return path.split(/[\\/]/u).pop() ?? path;
}
