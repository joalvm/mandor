import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listOrigins, rememberOrigin } from '../../src/origin/origins.js';
import type { StoredOrigin } from '../../src/origin/stored-origin.js';

let userData: string;

const LOCAL: StoredOrigin = {
    id: 'local',
    name: 'Local',
    kind: 'local',
    root: 'C:/Mandor/realtime/local',
};

function remote(id: string): StoredOrigin {
    return {
        id,
        name: id,
        kind: 'remote',
        url: `https://github.com/team/${id}.git`,
        root: `C:/Mandor/realtime/${id}`,
    };
}

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

describe('the origins the app remembers', () => {
    /** Each call reads the whole list and writes it back: two at once must not lose either one. */
    it('remembers every origin of calls that overlap', async () => {
        const ids = Array.from({ length: 10 }, (_value, index) => `repo-${String(index)}`);

        await Promise.all(ids.map((id) => rememberOrigin(userData, remote(id))));

        await expect(listOrigins(userData)).resolves.toHaveLength(ids.length);
    });

    it('starts empty on a machine that never opened one', async () => {
        await expect(listOrigins(userData)).resolves.toEqual([]);
    });

    it('gives back what it was told to remember, root included', async () => {
        await rememberOrigin(userData, LOCAL);

        await expect(listOrigins(userData)).resolves.toEqual([LOCAL]);
    });

    /** The same id remembered twice is one entry, with the record it has now. */
    it('replaces the entry of an id it already knew', async () => {
        await rememberOrigin(userData, LOCAL);
        await rememberOrigin(userData, { ...LOCAL, name: 'Casa' });

        await expect(listOrigins(userData)).resolves.toEqual([{ ...LOCAL, name: 'Casa' }]);
    });

    /** Local is the ground the app stands on: always first, however recent the others are. */
    it('keeps the local origin at the head when another one is remembered', async () => {
        await rememberOrigin(userData, LOCAL);
        await rememberOrigin(userData, remote('team'));

        await expect(listOrigins(userData)).resolves.toEqual([LOCAL, remote('team')]);
    });

    /** Remembering local again refreshes its record without moving it from the head. */
    it('keeps the local origin at the head when it is remembered again', async () => {
        await rememberOrigin(userData, LOCAL);
        await rememberOrigin(userData, remote('team'));
        await rememberOrigin(userData, LOCAL);

        await expect(listOrigins(userData)).resolves.toEqual([LOCAL, remote('team')]);
    });

    /** A remote origin chosen again goes first among the remotes, behind local. */
    it('moves a remembered remote ahead of the other remotes', async () => {
        await rememberOrigin(userData, LOCAL);
        await rememberOrigin(userData, remote('one'));
        await rememberOrigin(userData, remote('two'));
        await rememberOrigin(userData, remote('one'));

        await expect(listOrigins(userData)).resolves.toEqual([LOCAL, remote('one'), remote('two')]);
    });

    /** The list names directories of this machine. A repo is shared; this file cannot be. */
    it('writes only inside the user data directory', async () => {
        await rememberOrigin(userData, LOCAL);

        await expect(readdir(userData)).resolves.toEqual(['origins.json']);
    });

    /** It is a convenience the app rebuilds by choosing an origin, so a broken file costs nothing. */
    it('reads a corrupt file as no origins at all', async () => {
        await writeFile(join(userData, 'origins.json'), '{ not json', 'utf8');

        await expect(listOrigins(userData)).resolves.toEqual([]);
    });

    it('reads a file that holds something else as no origins at all', async () => {
        await writeFile(join(userData, 'origins.json'), '{"id":"local"}', 'utf8');

        await expect(listOrigins(userData)).resolves.toEqual([]);
    });

    /** Read as empty, the next origin remembered would write a list that lost every other one. */
    it('fails on a file that is there but cannot be read', async () => {
        await mkdir(join(userData, 'origins.json'));

        await expect(listOrigins(userData)).rejects.toThrow();
    });
});
