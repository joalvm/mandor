import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';

import { normalizeIconSvg } from './normalize-icon-svg.mjs';
import { readIconSources } from './read-icon-sources.mjs';
import {
    HEADER,
    barrelSource,
    registryTestSource,
    componentSource,
    namesSource,
    registrySource,
} from './icon-templates.mjs';

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(toolsRoot, '..');
const providerRoot = join(packageRoot, '../../node_modules/@vscode/codicons');
const rootArgument = process.argv.find((argument) => argument.startsWith('--root='));
const root = rootArgument?.slice('--root='.length) ?? packageRoot;
const check = process.argv.includes('--check');
const sourceDirectory = join(root, 'src');
const testsDirectory = join(root, 'tests');

const PRETTIER = {
    endOfLine: 'lf',
    parser: 'typescript',
    printWidth: 100,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
};

async function syncSource(relativePath, source) {
    const path = join(root, relativePath);
    const formatted = await format(source, PRETTIER);

    if (!check) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, formatted, 'utf8');

        return;
    }

    const current = await readFile(path, 'utf8').catch(() => '');

    if (current !== formatted) {
        throw new Error(`${relativePath} is stale; run npm run icons`);
    }
}

/** Outputs the generator claims as its own; only these are deleted once they go stale. */
function expectedOutputs(names) {
    return new Set([
        ...names.map((name) => `src/${name}.tsx`),
        'src/icon-name.ts',
        'src/icon-registry.ts',
        'src/index.ts',
        'tests/icons.test.tsx',
    ]);
}

async function pruneDirectory(directory, prefix, generated, hand) {
    const obsolete = (await readdir(directory)).filter(
        (entry) => generated.has(`${prefix}/${entry}`) === false && !hand.has(entry),
    );

    for (const entry of obsolete) {
        const path = join(directory, entry);
        const content = await readFile(path, 'utf8').catch(() => '');

        if (content.startsWith(HEADER)) {
            await rm(path);
            console.log(`deleted ${entry}: it is no longer in the manifest`);
        }
    }
}

async function pruneObsolete(names) {
    const generated = expectedOutputs(names);
    const hand = new Set(['icon-frame.tsx', 'icon-appearance.ts']);

    await pruneDirectory(sourceDirectory, 'src', generated, hand);
    await pruneDirectory(testsDirectory, 'tests', generated, hand);
}

function geometryOf(intentions) {
    const entries = Object.entries(intentions);

    if (entries.length === 0) {
        throw new Error('the manifest declares no intent');
    }

    if (!entries.every(([, entry]) => entry.state === 'approved')) {
        throw new Error('the active registry needs every intent approved; there is a candidate');
    }

    return Object.fromEntries(
        entries.map(([name, entry]) => [name, normalizeIconSvg(entry.svg, name).paths]),
    );
}

const { intentions } = await readIconSources({ packageRoot: root, providerRoot });
const geometry = geometryOf(intentions);
const names = Object.keys(geometry).sort();

for (const name of names) {
    await syncSource(
        `src/${name}.tsx`,
        componentSource(name, geometry[name], intentions[name].mirrored === true),
    );
}

await syncSource('src/icon-name.ts', namesSource(names));
await syncSource('src/icon-registry.ts', registrySource(names));
await syncSource('src/index.ts', barrelSource(names));
await syncSource('tests/icons.test.tsx', registryTestSource(names));

if (!check) {
    await pruneObsolete(names);
}
