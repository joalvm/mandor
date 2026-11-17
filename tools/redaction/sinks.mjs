import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, sep as SEPARATOR } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Where a border can appear: main, and the two windows. `packages/` beyond host is pure. */
const TREES = ['packages/host/src', 'apps/async/src', 'apps/sync/src'];

/**
 * What leaving the process looks like in this codebase: a file, the console, the push to the
 * window, and the object `ipcMain` answers with. Names, not concepts: a guard that tried to
 * understand the code would be a guard nobody trusts.
 */
const SINKS = [
    /\bwebContents\.send\(/,
    /\b(?:appendFile|writeFile|createWriteStream|atomicWrite|writeDoc|replaceDoc|retitleDoc)\(/,
    /\bconsole\./,
    /\bipcMain\b/,
];

/** Prose is not code. A comment that names `ipcMain` describes a border, it does not open one. */
function withoutComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

async function filesOf(tree) {
    const entries = await readdir(join(ROOT, tree), { recursive: true, withFileTypes: true }).catch(
        () => [],
    );

    return entries
        .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
        .map((entry) => join(entry.parentPath, entry.name));
}

/** Every module that reaches a sink, by its path from the root, with the sink it reached. */
export async function sinkModules() {
    /** @type {Record<string, string>} */
    const found = {};

    for (const tree of TREES) {
        Object.assign(found, await sinksOfTree(tree));
    }

    return found;
}

async function sinksOfTree(tree) {
    /** @type {Record<string, string>} */
    const found = {};

    for (const file of await filesOf(tree)) {
        const code = withoutComments(await readFile(file, 'utf8'));
        const sink = SINKS.find((pattern) => pattern.test(code));

        if (sink !== undefined) {
            found[pathFromRoot(file)] = String(sink);
        }
    }

    return found;
}

/** One shape for a path, whatever the separator this machine writes it with. */
function pathFromRoot(file) {
    return relative(ROOT, file).split(SEPARATOR).join('/');
}

/** Whether a module reaches the redaction at all: it imports it, whatever the name it takes. */
export async function importsRedaction(path) {
    const code = await readFile(join(ROOT, path), 'utf8');

    return [...code.matchAll(/import \{([^}]*)\} from/g)].some(([, names]) =>
        /redact/i.test(names),
    );
}

export { ROOT };
