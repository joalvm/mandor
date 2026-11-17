import { access } from 'node:fs/promises';

/**
 * Whether there is a file at the path. A read that failed only means "create it" when there is
 * truly nothing there: over a file that exists and cannot be parsed, creating destroys it.
 */
export async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);

        return true;
    } catch {
        return false;
    }
}
