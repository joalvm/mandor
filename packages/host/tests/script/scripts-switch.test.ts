import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createScriptsSwitch } from '../../src/script/scripts-switch.js';

let userDataDir: string;

beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'scripts-switch-'));
});

afterEach(async () => {
    await rm(userDataDir, { recursive: true, force: true });
});

function file(): string {
    return join(userDataDir, 'scripts.json');
}

describe('createScriptsSwitch', () => {
    it('is on when there is no file', async () => {
        expect((await createScriptsSwitch(userDataDir)).enabled()).toBe(true);
    });

    it.each([
        ['text that is no JSON', 'nope'],
        ['JSON of another shape', '{"enabled":"yes"}'],
        ['a list', '[]'],
    ])('is on when the file is %s', async (_name, text) => {
        await writeFile(file(), text);

        expect((await createScriptsSwitch(userDataDir)).enabled()).toBe(true);
    });

    it('is off after it was turned off, also after a restart', async () => {
        const first = await createScriptsSwitch(userDataDir);

        await first.set(false);

        expect(first.enabled()).toBe(false);
        expect(JSON.parse(await readFile(file(), 'utf8'))).toEqual({ enabled: false });
        expect((await createScriptsSwitch(userDataDir)).enabled()).toBe(false);
    });

    it('shows a change in the next read without reading the disk again', async () => {
        const scripts = await createScriptsSwitch(userDataDir);

        await writeFile(file(), '{"enabled":false}');
        expect(scripts.enabled()).toBe(true);

        const writing = scripts.set(false);

        expect(scripts.enabled()).toBe(false);
        await writing;
        await scripts.set(true);
        expect(scripts.enabled()).toBe(true);
        expect((await createScriptsSwitch(userDataDir)).enabled()).toBe(true);
    });

    it('leaves on disk what was set last when two changes come together', async () => {
        const scripts = await createScriptsSwitch(userDataDir);

        await Promise.all([scripts.set(false), scripts.set(true), scripts.set(false)]);

        expect((await createScriptsSwitch(userDataDir)).enabled()).toBe(false);
    });
});
