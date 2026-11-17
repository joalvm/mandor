import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Every module the description of an item is drawn, remembered and written by. */
const PATH = [
    'components/strip/ConnectionDescription.tsx',
    'components/strip/ConnectionStrip.tsx',
    'lib/connection-section.ts',
    'lib/pending-connection-write.ts',
].map((name) =>
    fileURLToPath(
        new URL(`../../../../src/renderer/features/connections/${name}`, import.meta.url),
    ),
);

/**
 * The three ways something in this app becomes openable on its own: a kind of tab, a command of
 * the palette, and a URI to point at from a doc. The description of an item has none of them,
 * because it is a field of what is being looked at and not a document beside it.
 */
const OPENERS = ['<TabKind', 'formatResourceUri', 'registerCommand'];

let planted: string;

beforeEach(async () => {
    planted = await mkdtemp(join(tmpdir(), 'mandor-description-'));
});

afterEach(async () => {
    await rm(planted, { recursive: true, force: true });
});

async function openersIn(files: readonly string[]): Promise<string[]> {
    const found = await Promise.all(files.map(openersOf));

    return found.flat();
}

async function openersOf(file: string): Promise<string[]> {
    const text = await readFile(file, 'utf8');

    return OPENERS.filter((opener) => text.includes(opener)).map(
        (opener) => `${basename(file)}: ${opener}`,
    );
}

describe('the description of an item', () => {
    it('names no way of opening on its own', async () => {
        expect(await openersIn(PATH)).toEqual([]);
    });

    it('is caught when a module of its path starts to name one', async () => {
        const file = join(planted, 'ConnectionStrip.tsx');

        await writeFile(file, '<TabKind id="description" />\n');

        expect(await openersIn([file])).toEqual(['ConnectionStrip.tsx: <TabKind']);
    });
});
