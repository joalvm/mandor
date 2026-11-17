import { run } from '../git/run.js';

/**
 * Takes one file back to the text of the last commit that holds it. It is the second level of
 * undo the app offers: the editor undoes keystrokes, and this undoes everything written since
 * the app last wrote the file down.
 *
 * The path travels as a pathspec after `--`, so a name that opens with a dash is read as a path
 * and never as an option, and it is the only path touched: whatever else the tree holds is left
 * exactly as the user left it. A file the history has never seen fails here rather than being
 * emptied, because it has no earlier text and inventing one would delete work.
 *
 * It takes the same lock a commit takes: the caller runs it in the turn of the other writes.
 */
export async function restoreFile(root: string, path: string): Promise<void> {
    await run(['checkout', 'HEAD', '--', path], root);
}
