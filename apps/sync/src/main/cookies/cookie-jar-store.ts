import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { atomicWrite, cookieJarFile, inTurn, readTextOrNull } from '@mandor/store-fs';
import type { CookiePort } from '@mandor/transport-sync';
import { CookieJar } from 'tough-cookie';

import { jarCookiePort } from './jar-cookie-port.js';

/** Which jar: the one of an environment of a workspace, or of the workspace without one. */
type JarPlace = {
    root: string;
    workspaceId: string;
    environmentId: string | null;
};

/** One send's view of its jar: the port the transport calls, and the end that keeps what changed. */
type CookieSession = {
    port: CookiePort;
    finish: () => Promise<void>;
};

export type CookieJarStore = {
    /** The jar of the place: read from disk the first time, the same one afterwards. */
    jarOf: (place: JarPlace) => Promise<CookieJar>;
    /** Writes the jar as it is now. */
    save: (place: JarPlace) => Promise<void>;
    /** A port over the jar for one send; `finish` saves only if an answer changed it. */
    session: (place: JarPlace) => Promise<CookieSession>;
};

/** A jar read from its file, and whether it stands for the file: one that could not be read does not. */
type JarRead = { jar: CookieJar; kept: boolean };

/** A text that is not a jar — cut short, from another version — is an empty one: the next login fills it. */
async function jarOfText(text: string): Promise<CookieJar> {
    try {
        return await CookieJar.deserialize(text);
    } catch {
        return new CookieJar();
    }
}

/**
 * A file that is gone is an empty jar. One that is there and cannot be read — locked for a
 * moment, too large — lends an empty jar too, so the send goes on, but that jar is not the file:
 * it is not kept for the next send and nothing is written over the file from it.
 */
async function loadJar(file: string): Promise<JarRead> {
    const text = await readTextOrNull(file).catch(() => undefined);

    if (text === undefined) {
        return { jar: new CookieJar(), kept: false };
    }

    return { jar: text === null ? new CookieJar() : await jarOfText(text), kept: true };
}

/**
 * The jars of the app, one in memory per file so two sends of one environment share their
 * cookies. A border of the process that writes no text of the user: what a server set, in
 * `.mandor/cookies`, which is never committed.
 */
export function createCookieJarStore(): CookieJarStore {
    const jars = new Map<string, Promise<CookieJar>>();
    const lent = new WeakSet<CookieJar>();
    const fileOf = (place: JarPlace): string =>
        cookieJarFile(place.root, place.workspaceId, place.environmentId);
    const load = async (file: string): Promise<CookieJar> => {
        const { jar, kept } = await loadJar(file);

        if (!kept) {
            lent.add(jar);
            jars.delete(file);
        }

        return jar;
    };

    const jarOf = (place: JarPlace): Promise<CookieJar> => {
        const file = fileOf(place);
        const known = jars.get(file) ?? load(file);

        jars.set(file, known);

        return known;
    };

    const write = async (place: JarPlace, file: string): Promise<void> => {
        const jar = await jarOf(place);

        if (lent.has(jar)) {
            return;
        }

        const serialized = await jar.serialize();

        await mkdir(dirname(file), { recursive: true });
        await atomicWrite(file, JSON.stringify(serialized));
    };

    // Each save of a file waits for the one before it and reads the jar only then, so the copy
    // that lands last is the newest: two saves in flight could otherwise finish out of order.
    const save = (place: JarPlace): Promise<void> => {
        const file = fileOf(place);

        return inTurn(file, () => write(place, file));
    };

    return {
        jarOf,
        save,
        session: async (place) => {
            const port = jarCookiePort(await jarOf(place));

            return {
                port,
                finish: async () => {
                    if (port.changed()) {
                        await save(place);
                    }
                },
            };
        },
    };
}
