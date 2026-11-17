import { run } from '../git/run.js';

/** Who commits when the machine says nobody. Local to the repo, never the user's global. */
const IDENTITY = { 'user.name': 'Mandor', 'user.email': 'mandor@localhost' };

/**
 * The repos this run already knows can commit. Every save of the app commits, and asking git
 * again each time costs a process for nothing: an identity, once there, does not leave by itself.
 */
const READY = new Set<string>();

/**
 * Guarantees the repo can commit. A machine with no `user.name` cannot, and losing the work
 * over a setting the user never made is worse than signing it with a local name.
 *
 * Returns true when it had to write the fallback, which is the moment to tell the user. It
 * happens once per repo: from then on the setting is there and the answer is false.
 */
export async function ensureIdentity(root: string): Promise<boolean> {
    if (READY.has(root)) {
        return false;
    }

    const configured = await configOf(root);
    // Only the half that is missing is written: the other half is the user's.
    const missing = Object.entries(IDENTITY).filter(([key]) => !configured.get(key));

    for (const [key, fallback] of missing) {
        await run(['config', '--local', key, fallback], root);
    }

    READY.add(root);

    return missing.length > 0;
}

/**
 * Commits with `args` once the repo can. A commit git refuses makes this run ask again: a repo
 * made anew where an old one was has no identity of its own, and once it has one the commit is
 * tried again. Refused for anything else, the refusal is the answer.
 */
export async function commitIn(root: string, args: string[]): Promise<void> {
    await ensureIdentity(root);

    try {
        await run(['commit', ...args], root);
    } catch (error) {
        READY.delete(root);

        if (!(await ensureIdentity(root))) {
            throw error;
        }

        await run(['commit', ...args], root);
    }
}

/** Every setting git sees from the repo, in one process: the last one of a key wins, as in git. */
async function configOf(root: string): Promise<Map<string, string>> {
    const settings = new Map<string, string>();

    for (const entry of (await run(['config', '--list', '-z'], root)).split('\0')) {
        const end = entry.indexOf('\n');

        settings.set(end < 0 ? entry : entry.slice(0, end), end < 0 ? '' : entry.slice(end + 1));
    }

    return settings;
}
