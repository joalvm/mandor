import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROVIDER = '@vscode/codicons';
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function sha256Of(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function readIntention(name, entry, root, providerRoot) {
    const { source } = entry;
    const cited = source.origin === 'codicons' ? `${source.id}.svg` : source.file;
    const path =
        source.origin === 'codicons' ? join(providerRoot, 'src/icons', cited) : join(root, cited);

    if (source.origin === 'derived' && !/^codicons:[a-z0-9-]+$/.test(source.base ?? '')) {
        throw new Error(`${name}: derivative without a codicons:<id> base`);
    }

    let svg;

    try {
        svg = await readFile(path, 'utf8');
    } catch {
        throw new Error(`${name}: the source ${cited} is not there`);
    }

    if (sha256Of(svg) !== source.sha256) {
        throw new Error(`${name}: sha256 does not match the cited source`);
    }

    return { ...entry, svg };
}

/**
 * Reads the manifest and returns each intent with the bytes of its source: the pinned provider
 * must be the installed one, each hash must match what is cited and each derivative must declare
 * its base. Anything that does not add up fails with the name of the intent.
 */
export async function readIconSources(options = {}) {
    const root = options.packageRoot ?? packageRoot;
    const providerRoot = options.providerRoot ?? join(root, '../../node_modules', PROVIDER);
    const manifest = JSON.parse(await readFile(join(root, 'icon-sources.json'), 'utf8'));

    if (manifest.provider.package !== PROVIDER) {
        throw new Error(`provider ${manifest.provider.package}, expected ${PROVIDER}`);
    }

    const providerManifest = JSON.parse(await readFile(join(providerRoot, 'package.json'), 'utf8'));

    if (providerManifest.version !== manifest.provider.version) {
        throw new Error(
            `pinned provider ${manifest.provider.version}, installed ${providerManifest.version}`,
        );
    }

    const intentions = {};

    for (const [name, entry] of Object.entries(manifest.intentions)) {
        intentions[name] = await readIntention(name, entry, root, providerRoot);
    }

    return { provider: manifest.provider, intentions };
}
