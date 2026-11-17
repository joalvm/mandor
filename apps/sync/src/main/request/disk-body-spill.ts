import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';

import { bodiesDir, bodyFile, inTurn, renameWithRetry } from '@mandor/store-fs';
import type { BodySpill } from '@mandor/transport-sync';

import type { BodyHold } from './body-holds.js';

const TEMPORARY = 'tmp-';

/** The half files of the spills of this run that are still writing. */
const LIVE = new Set<string>();

/** The folders this run already cleared of what an earlier run left. */
const SWEPT = new Set<string>();

/**
 * Main killed mid-body neither finishes nor aborts its spill, and nothing else names the half
 * file. Once per folder and run, the first spill clears them; a spill of this run in flight is
 * never one of them. Clearing is housekeeping: when it fails, the send goes on.
 */
async function sweepLeftovers(directory: string): Promise<void> {
    if (SWEPT.has(directory)) {
        return;
    }

    SWEPT.add(directory);

    const names = await readdir(directory).catch(() => []);
    const left = names
        .filter((name) => name.startsWith(TEMPORARY))
        .map((name) => join(directory, name))
        .filter((path) => !LIVE.has(path));

    await Promise.all(left.map((path) => rm(path, { force: true }).catch(() => undefined)));
}

async function exists(path: string): Promise<boolean> {
    return stat(path).then(
        () => true,
        () => false,
    );
}

/**
 * The spill of the transport on disk: the bytes of a big body go to a file of `.mandor/bodies`
 * as they arrive, and once the hash is known the file takes its name. A body that is already
 * there is the same bytes, so the new file is dropped instead of replacing it. Nothing here
 * redacts: the bytes are the response as it came, and `.mandor/` is never committed. The `hold`
 * of the send keeps the body from removal until the send's entry names it.
 */
export async function diskBodySpill(root: string, hold?: BodyHold): Promise<BodySpill> {
    const directory = bodiesDir(root);
    const temporary = join(directory, `${TEMPORARY}${randomUUID()}`);

    LIVE.add(temporary);
    await mkdir(directory, { recursive: true });
    await sweepLeftovers(directory);

    const stream = createWriteStream(temporary);
    const closed = once(stream, 'close');

    async function close(): Promise<void> {
        stream.end();
        await closed;
    }

    /** The half file stays live until it is renamed or removed, so no sweep takes it first. */
    async function settle(work: () => Promise<void>): Promise<void> {
        try {
            await close();
            await work();
        } finally {
            LIVE.delete(temporary);
        }
    }

    return {
        write: (chunk) =>
            new Promise((resolve, reject) => {
                stream.write(chunk, (error) => {
                    if (error === null || error === undefined) {
                        resolve();
                    } else {
                        reject(error);
                    }
                });
            }),
        finish: async (sha256) => {
            await settle(() =>
                inTurn(root, async () => {
                    const target = bodyFile(root, sha256);

                    hold?.keep(sha256);

                    if (await exists(target)) {
                        await rm(temporary, { force: true });
                    } else {
                        await renameWithRetry(temporary, target);
                    }
                }),
            );

            return sha256;
        },
        abort: () => settle(() => rm(temporary, { force: true })),
    };
}
