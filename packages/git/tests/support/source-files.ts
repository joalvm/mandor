import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Path relative to the scanned directory, always with forward slashes so it compares. */
export type SourceFile = { path: string; text: string };

/** Reads a tree of TypeScript so a test can assert on what the package does not say. */
export async function sourceFilesOf(dir: string): Promise<SourceFile[]> {
    const names = await readdir(dir, { recursive: true });
    const sources = names.filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'));

    return Promise.all(sources.map((name) => sourceFileOf(dir, name)));
}

async function sourceFileOf(dir: string, name: string): Promise<SourceFile> {
    return { path: name.replaceAll('\\', '/'), text: await readFile(join(dir, name), 'utf8') };
}

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));

/**
 * The source of every package and every app of the repo, each file named from the repo root.
 * The rule a guard states is about the whole program, not about the package that owns it.
 */
export async function repoSourceFiles(): Promise<SourceFile[]> {
    const found: SourceFile[] = [];

    for (const group of ['packages', 'apps']) {
        for (const name of await readdir(join(REPO, group))) {
            found.push(...(await sourcesOfModule(group, name)));
        }
    }

    return found;
}

async function sourcesOfModule(group: string, name: string): Promise<SourceFile[]> {
    const src = join(REPO, group, name, 'src');

    if (!existsSync(src)) {
        return [];
    }

    const files = await sourceFilesOf(src);

    return files.map((file) => ({ ...file, path: `${group}/${name}/src/${file.path}` }));
}
