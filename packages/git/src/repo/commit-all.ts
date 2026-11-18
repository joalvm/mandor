import { run } from '../git/run.js';
import { commitIn } from './ensure-identity.js';
import { PRIVATE_DIR } from './private-dir.js';

/**
 * Saves everything the app just wrote, in one commit. The pathspec keeps `add` inside the
 * repo: run from anywhere else it would sweep in whatever the working directory happens to
 * hold. A change that turned out to be no change gets no commit saying otherwise.
 *
 * The private directory leaves the index after the add, not only by the ignore rule: that rule is
 * a file of the repo, and a change pulled from someone else can take it away. A private file a
 * commit already carries leaves too; the copy on disk stays. An exclude pathspec would not do:
 * git fails an `add` whose exclude names an ignored path.
 *
 * Git takes `.git/index.lock` for it and refuses a second writer that meets it there: the caller
 * runs the writes of one repo one at a time.
 */
export async function commitAll(root: string, message: string): Promise<void> {
    await run(['add', '-A', '--', '.'], root);
    await run(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', PRIVATE_DIR], root);

    const staged = await run(['diff', '--cached', '--name-only'], root);

    if (staged === '') {
        return;
    }

    await commitIn(root, ['-m', message]);
}
