import { run } from '../git/run.js';

/**
 * When the history last touched one path, as an ISO instant; null when no commit did or the
 * history cannot answer. The date is display data, not a fact the app depends on, so any
 * failure of the history reads as "never touched" instead of failing the list.
 */
export async function lastChange(root: string, path: string): Promise<string | null> {
    try {
        const output = await run(['log', '-1', '--format=%aI', '--', path], root);

        return output === '' ? null : output;
    } catch {
        return null;
    }
}
