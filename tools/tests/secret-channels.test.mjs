import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    CHANNELS,
    secretKeptResultSchema,
    secretRevealRequestSchema,
    secretRevealResultSchema,
} from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

const ENV_SOURCE = join(dirname(fileURLToPath(import.meta.url)), '../../packages/env/src');

/**
 * Every channel about secrets, each with what it gives back. A fifth name reaching this list
 * is the moment to ask whether it reads values in bulk, and the answer is easier to give when
 * the four that exist are written down than when they are counted in a file of thirty.
 */
const SECRET_CHANNELS = {
    secretSet: 'takes one value in and gives nothing back',
    secretClear: 'takes one value out and gives nothing back',
    secretReveal: 'gives one value back, by name, because its owner asked for it',
    secretKept: 'says which names have a value on this machine, never a value',
};

/** What the renderer would have to name to talk to main behind the bridge. */
const BEHIND_THE_BRIDGE = /CHANNELS|ipcRenderer/;

async function envSources() {
    const entries = await readdir(ENV_SOURCE, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name));

    return Promise.all(
        files.map(async (file) => ({
            name: join(file.parentPath, file.name),
            source: await readFile(join(file.parentPath, file.name), 'utf8'),
        })),
    );
}

describe('the channels that carry secrets', () => {
    it('has no channel about secrets beyond the four that are written down here', () => {
        const declared = Object.keys(CHANNELS).filter((name) => name.startsWith('secret'));

        expect(declared.sort()).toEqual(Object.keys(SECRET_CHANNELS).sort());
    });

    /** The request names one variable. A list of names has nowhere to go. */
    it('reveals one value per call and refuses to be asked for several', () => {
        const place = { workspaceId: 'payments', environmentId: 'prod' };

        expect(secretRevealRequestSchema.safeParse({ ...place, name: 'TOKEN' }).success).toBe(true);
        expect(secretRevealRequestSchema.safeParse({ ...place, names: ['A', 'B'] }).success).toBe(
            false,
        );
    });

    it('answers a reveal with one value and not with a collection of them', () => {
        expect(secretRevealResultSchema.safeParse({ ok: true, value: { value: 'tok' } }).success) //
            .toBe(true);
        expect(secretRevealResultSchema.safeParse({ ok: true, value: [{ value: 'tok' }] }).success) //
            .toBe(false);
    });

    /** The one call that answers about every secret of an environment carries names only. */
    it('lists which secrets are kept here by name, with no value attached', () => {
        expect(secretKeptResultSchema.safeParse({ ok: true, value: ['TOKEN'] }).success).toBe(true);
        expect(
            secretKeptResultSchema.safeParse({
                ok: true,
                value: [{ name: 'TOKEN', value: 'tok' }],
            }).success,
        ).toBe(false);
    });

    /**
     * The tab that paints secrets reaches main through the bridge and nowhere else. Naming a
     * channel there would open a second door next to the one this file guards.
     */
    it('leaves the environment tab with no way to invoke a channel by name', async () => {
        const named = (await envSources()).filter((file) => BEHIND_THE_BRIDGE.test(file.source));

        expect(named.map((file) => file.name)).toEqual([]);
    });
});
