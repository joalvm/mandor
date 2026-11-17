import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import { atomicWrite, readTextOrNull } from '@mandor/store-fs';

const FILE = 'approved-scripts.txt';

/** How many approvals the file keeps once it loads. The oldest go first. */
const KEPT = 5_000;

const HASH = /^[0-9a-f]{64}$/u;

export type ApprovedScripts = {
    isApproved: (key: string) => Promise<boolean>;
    approve: (key: string) => Promise<void>;
    forgetAll: () => Promise<void>;
};

type Loaded = { keys: Set<string>; clean: boolean };

function parse(text: string): Loaded {
    const rows = text.split('\n');
    const kept = rows.filter((row) => HASH.test(row));
    const keys = new Set(kept);

    // `clean` is a file that loads as it is: only hashes, each on a line of its own, within the cap.
    const clean = rows.at(-1) === '' && kept.length === rows.length - 1 && keys.size <= KEPT;

    return { keys, clean };
}

function newest(keys: Set<string>): Set<string> {
    return new Set([...keys].slice(-KEPT));
}

/**
 * The scripts approved on this machine, one hash per line in `userDataDir`, never in a repo. The
 * file loads when it is first asked, and a line that is no hash does not spoil the others.
 * Everything goes through one queue: a compaction does not step on an append, and a forget does not
 * leave an approval that came before it.
 */
export function approvedScripts(userDataDir: string): ApprovedScripts {
    const path = join(userDataDir, FILE);
    let tail: Promise<unknown> = Promise.resolve();
    let known: Set<string> | undefined;

    function enqueue<T>(job: () => Promise<T>): Promise<T> {
        const run = tail.then(job);

        tail = run.catch(() => undefined);

        return run;
    }

    async function load(): Promise<Set<string>> {
        if (known !== undefined) {
            return known;
        }

        const text = await readTextOrNull(path);

        if (text === null) {
            known = new Set();

            return known;
        }

        const loaded = parse(text);
        const keys = newest(loaded.keys);

        if (!loaded.clean) {
            await atomicWrite(path, [...keys].map((key) => `${key}\n`).join(''));
        }

        known = keys;

        return keys;
    }

    return {
        isApproved: (key) => enqueue(async () => (await load()).has(key)),
        approve: (key) =>
            enqueue(async () => {
                const keys = await load();

                if (!keys.has(key)) {
                    await appendFile(path, `${key}\n`);
                    keys.add(key);
                }
            }),
        forgetAll: () =>
            enqueue(async () => {
                await atomicWrite(path, '');
                known = new Set();
            }),
    };
}
