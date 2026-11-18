import { run } from '../git/run.js';
import { pathsOf } from './paths-of.js';

/**
 * Moves the branch forward to what the origin has, and only forward: when the two have gone
 * apart git refuses and nothing is touched. Answers the paths the move changed, relative to the
 * root and with forward slashes, so the window can be told what to read again.
 */
export async function fastForward(root: string): Promise<string[]> {
    const before = await run(['rev-parse', 'HEAD'], root);

    await run(['merge', '--ff-only', '@{u}'], root);

    const changed = await run(['diff', '--name-only', '-z', `${before}..HEAD`], root);

    return pathsOf(changed);
}
