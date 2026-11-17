import { run } from '../git/run.js';
import { commitIn } from './ensure-identity.js';
import { pathsOf } from './paths-of.js';

/**
 * Closes the merge that is open with one commit that has both sides as parents. The paths are
 * the ones the caller answered: what it wrote to them, or deleted, is what gets recorded.
 * What git joined by itself is already staged. Answers the paths the merge changed in this
 * branch, relative to the root and with forward slashes, so the window can be told what to
 * read again.
 */
export async function concludeMerge(
    root: string,
    paths: readonly string[],
    message: string,
): Promise<string[]> {
    const before = await run(['rev-parse', 'HEAD'], root);

    if (paths.length > 0) {
        await run(['add', '-A', '--', ...paths], root);
    }

    await commitIn(root, ['-m', message]);

    return pathsOf(await run(['diff', '--name-only', '-z', `${before}..HEAD`], root));
}
