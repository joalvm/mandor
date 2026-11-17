/**
 * Whether a failure of the disk says only that nothing is at the path. Every other one — a file
 * where a folder should be, a refused permission — is a real failure and must not read as empty.
 */
export function isMissing(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
