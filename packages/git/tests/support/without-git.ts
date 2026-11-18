/**
 * Runs `work` on a machine that looks like it has no git. Emptying `PATH` is what a missing
 * binary looks like to a spawned process, and it needs no mock of `simple-git` to arrange.
 */
export async function withoutGit<T>(work: () => Promise<T>): Promise<T> {
    const path = process.env['PATH'] ?? '';

    process.env['PATH'] = '';

    try {
        return await work();
    } finally {
        process.env['PATH'] = path;
    }
}
