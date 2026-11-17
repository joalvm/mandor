import { join } from 'node:path';

import { atomicWrite, readTextOrNull } from '@mandor/store-fs';
import { z } from 'zod';

/** The file of the switch, beside the app and never inside an origin. */
const FILE = 'scripts.json';

const switchFileSchema = z.object({ enabled: z.boolean() });

/** Whether the scripts of this machine run. */
export type ScriptsSwitch = {
    /** Answers from memory: it is asked once per frame and never touches the disk. */
    enabled: () => boolean;
    set: (enabled: boolean) => Promise<void>;
};

/** What was kept, or on: a file that is missing, broken or of another shape turns nothing off. */
async function readEnabled(path: string): Promise<boolean> {
    const text = (await readTextOrNull(path)) ?? '';

    try {
        const parsed = switchFileSchema.safeParse(JSON.parse(text));

        return parsed.success ? parsed.data.enabled : true;
    } catch {
        return true;
    }
}

/**
 * The switch that stops every script without deleting or unapproving any: the way out when the
 * engine fails. It loads once; `set` changes the memory first and the disk after, one write at a
 * time so the last change is the one that stays.
 */
export async function createScriptsSwitch(userDataDir: string): Promise<ScriptsSwitch> {
    const path = join(userDataDir, FILE);
    let enabled = await readEnabled(path);
    let tail: Promise<unknown> = Promise.resolve();

    return {
        enabled: () => enabled,
        set: (next) => {
            enabled = next;

            const write = tail.then(() => atomicWrite(path, JSON.stringify({ enabled: next })));

            tail = write.catch(() => undefined);

            return write;
        },
    };
}
