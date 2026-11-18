import { simpleGit } from 'simple-git';

import { gitErrorCodeOf } from './git-error-code.js';
import { isForcingPush } from './forcing-push.js';
import { GitError } from './git-error.js';
import { networkEnv, type NetworkAccess } from './network-access.js';

// A call to a host ends in a failure instead of hanging: nobody is at the other side to wait.
const NETWORK_TIMEOUT_MS = 60_000;

/**
 * simple-git 4 strips every git-named variable from the ambient environment before spawning
 * git. These six are the ones meant to travel: the suite pins identity and config isolation
 * with them, and in production they are there only when the user's own session sets them.
 */
const AMBIENT = [
    'GIT_AUTHOR_NAME',
    'GIT_AUTHOR_EMAIL',
    'GIT_COMMITTER_NAME',
    'GIT_COMMITTER_EMAIL',
    'GIT_CONFIG_GLOBAL',
    'GIT_CONFIG_SYSTEM',
] as const;

/**
 * A link that comes down from an origin is written as a plain file holding where it pointed.
 * Checked out as a link, a repo from elsewhere could point a doc or an environment at any file
 * of this machine: the window would show it, a request could send it, and saving would write
 * through it. Every call carries it, so no checkout, merge or restore can make a link.
 *
 * Long paths are on for the same reason: a collection nests ids, and on Windows a checkout of
 * a deep one fails when the setting is off.
 */
const CONFIG = ['core.symlinks=false', 'core.longpaths=true'];

/** No path of the app rewrites what an origin holds: the call is refused before git is asked. */
function refuseForcing(args: string[]): void {
    if (isForcingPush(args)) {
        throw new GitError('git-failed', 'refused a push that would rewrite the origin');
    }
}

/**
 * The only place in the repository that spawns git. A second one would be a path without
 * these guarantees: every failure mapped to a code, and the output of git kept in the log.
 */
export async function run(args: string[], root: string): Promise<string> {
    // Only the trailing newline goes: a leading space is data in the porcelain format.
    return (await runText(args, root)).trimEnd();
}

/**
 * What git printed, byte for byte. The text of a file is the one thing whose last newline is
 * data, and a merge of two texts reads it: trimming it would hand the merge a file that never
 * existed.
 */
export async function runText(args: string[], root: string): Promise<string> {
    refuseForcing(args);

    const git = simpleGit({ allowEnvironment: [...AMBIENT], baseDir: root, config: CONFIG });

    try {
        return await git.raw(args);
    } catch (error) {
        throw new GitError(gitErrorCodeOf(error), String(error));
    }
}

/**
 * The variables Mandor itself puts in the environment of a call that crosses the network:
 * the guarantee that git never prompts, and the header that carries a token.
 */
const NETWORK_KEYS = [
    'GIT_TERMINAL_PROMPT',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_KEY_0',
    'GIT_CONFIG_VALUE_0',
] as const;

/** The plain names simple-git guards besides the ones that start with `GIT_`. */
const GUARDED_PLAIN = ['editor', 'pager', 'prefix', 'ssh_askpass', 'visual'];

/**
 * Everything the session has, minus what simple-git guards: the child must still find its PATH,
 * and a guarded name handed over through `.env()` is a refusal where an inherited one is only
 * dropped. What Mandor needs of the `GIT_` names is in `AMBIENT`.
 */
function sessionEnv(): Record<string, string> {
    const kept = Object.entries(process.env).filter(([key]) => {
        const name = key.toLowerCase();

        if (GUARDED_PLAIN.includes(name)) {
            return false;
        }

        return !name.startsWith('git_') || AMBIENT.some((own) => own === key);
    });

    return Object.fromEntries(kept) as Record<string, string>;
}

/**
 * Runs git against a host. `root` is the working copy, or null for a question that needs none
 * (`ls-remote`, the first `clone`). The access is what the call may present and nothing else
 * crosses: see `networkEnv`.
 */
export async function runNetwork(
    args: string[],
    root: string | null,
    access: NetworkAccess,
): Promise<string> {
    refuseForcing(args);

    const git = simpleGit({
        allowEnvironment: [...AMBIENT, ...NETWORK_KEYS],
        ...(root === null ? {} : { baseDir: root }),
        config: CONFIG,
        timeout: { block: NETWORK_TIMEOUT_MS },
        // The header is built here from the access, and the config paths are the session's own:
        // neither is input from outside, which is what these two guards exist to stop.
        unsafe: { allowUnsafeConfigEnvCount: true, allowUnsafeConfigPaths: true },
    }).env({ ...sessionEnv(), ...networkEnv(access) });

    try {
        return (await git.raw(args)).trimEnd();
    } catch (error) {
        throw new GitError(gitErrorCodeOf(error), String(error));
    }
}
