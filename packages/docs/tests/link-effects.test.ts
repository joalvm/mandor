import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * The surface that draws a doc: everything a markdown link is rendered by, and the module a
 * link taken by the reader reaches at the far end of it. Read from the root of the runner,
 * which is the root of the repository: this test runs in a DOM where a module URL is no
 * longer a path on disk.
 */
const SURFACE = join(process.cwd(), 'packages', 'docs', 'src');

/**
 * Every channel of the bridge that makes something happen, named the way the renderer spells
 * it. A doc is written by whoever wrote the repository, so the dangerous pair is a shared
 * document and an automatic effect; this cuts the second one.
 */
const EFFECTS = [
    'connection.create',
    'connection.delete',
    'connection.update',
    'origin.empty',
    'ws.close',
    'ws.open',
    'ws.send',
];

let planted: string;

beforeEach(async () => {
    planted = await mkdtemp(join(tmpdir(), 'mandor-docs-'));
});

afterEach(async () => {
    await rm(planted, { recursive: true, force: true });
});

async function sourcesUnder(dir: string): Promise<string[]> {
    const names = await readdir(dir, { recursive: true });

    return names.filter((name) => /\.tsx?$/u.test(name)).map((name) => join(dir, name));
}

async function effectsIn(files: readonly string[]): Promise<string[]> {
    const found = await Promise.all(files.map(effectsOf));

    return found.flat();
}

async function effectsOf(file: string): Promise<string[]> {
    const text = await readFile(file, 'utf8');

    return EFFECTS.filter((effect) => text.includes(effect)).map(
        (effect) => `${basename(file)}: ${effect}`,
    );
}

describe('what a link of a doc can reach', () => {
    it('names no way of making something happen', async () => {
        expect(await effectsIn(await sourcesUnder(SURFACE))).toEqual([]);
    });

    it('is caught when a module of the path starts to name one', async () => {
        const file = join(planted, 'open-resource-link.ts');

        await writeFile(file, 'await bridge.ws.send({ id, text });\n');

        expect(await effectsIn([file])).toEqual(['open-resource-link.ts: ws.send']);
    });
});
