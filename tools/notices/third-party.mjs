import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The notices of what an installer carries from others: each package the app bundles or loads,
 * its version, its license and the files in which it states them. MIT, BSD and ISC ask for their
 * notice in every copy, Apache-2.0 for its NOTICE: the copy is the installer, so the notices
 * travel inside it.
 */

const MARKER = '/node_modules/';

/** The files of a package that state its license or its notices, whatever their extension. */
const LICENSE_FILE = /^(?:licen[cs]e|copying|notice)(?:[.\-_].*)?$/iu;

/** How a manifest names its repository, read into an address a person can open. */
const SOURCE_SHAPES = [
    { shape: /^github:(?<path>[^/\s]+\/[^/\s]+)$/u, address: 'https://github.com/$<path>' },
    { shape: /^(?<path>[\w.-]+\/[\w.-]+)$/u, address: 'https://github.com/$<path>' },
    { shape: /^git@github\.com:(?<path>.+?)(?:\.git)?$/u, address: 'https://github.com/$<path>' },
    { shape: /^(?:git\+)?(?:git|https?):\/\/(?<rest>.+?)(?:\.git)?$/u, address: 'https://$<rest>' },
];

const OURS = '@mandor/';
const RULE = '='.repeat(80);
const THIN = '-'.repeat(80);

const PREAMBLE = [
    'Third-party notices',
    '',
    'This app is free software under the GNU Affero General Public License v3.0 only: see LICENSE',
    'in this folder. It is built on the software below, each part under its own license, whose',
    'terms and notices are reproduced here.',
    '',
    'Chromium, Node.js and the other components inside Electron list their notices in',
    'LICENSES.chromium.html, which ships beside the app.',
    '',
].join('\n');

/**
 * The folder of the package a module of a bundle comes from, with `/`, or nothing for a module
 * of the repo. The last `node_modules` decides, so a copy nested in another package is its own.
 *
 * @param {string} id the module as the bundler names it, perhaps with a query or a `\0` prefix
 */
export function packageRootOf(id) {
    const path = id.replace(/^\0/u, '').replace(/\?.*$/u, '').replaceAll('\\', '/');
    const at = path.lastIndexOf(MARKER);

    if (at === -1) {
        return undefined;
    }

    const segments = path.slice(at + MARKER.length).split('/');
    const length = segments[0]?.startsWith('@') ? 2 : 1;

    return `${path.slice(0, at + MARKER.length)}${segments.slice(0, length).join('/')}`;
}

/** The license a manifest declares, in the old shapes too; `UNKNOWN` when it declares none. */
export function licenseOf(manifest) {
    const { license, licenses } = manifest;

    if (typeof license === 'string') {
        return license;
    }

    if (typeof license?.type === 'string') {
        return license.type;
    }

    if (Array.isArray(licenses) && licenses.length > 0) {
        return licenses.map((each) => each.type ?? each).join(' OR ');
    }

    return 'UNKNOWN';
}

function sourceOf(manifest) {
    const named = manifest.repository;
    const repository = typeof named === 'string' ? named : named?.url;

    if (typeof repository !== 'string') {
        return typeof manifest.homepage === 'string' ? manifest.homepage : undefined;
    }

    const match = SOURCE_SHAPES.find(({ shape }) => shape.test(repository));

    return match === undefined ? repository : repository.replace(match.shape, match.address);
}

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

/** A package as the notices tell it, read from its folder on disk. */
export function readEntry(root) {
    const manifest = readJson(join(root, 'package.json'));
    const texts = readdirSync(root)
        .filter((file) => LICENSE_FILE.test(file))
        .sort()
        .map((file) => ({ file, text: readFileSync(join(root, file), 'utf8').trimEnd() }));

    return {
        name: manifest.name,
        version: manifest.version,
        license: licenseOf(manifest),
        source: sourceOf(manifest),
        texts,
    };
}

/** Where node finds a package asked for from a folder: there, or in a folder above it. */
function lookup(name, from) {
    for (let dir = from; ; dir = dirname(dir)) {
        const candidate = join(dir, 'node_modules', name);

        if (existsSync(join(candidate, 'package.json'))) {
            return candidate;
        }

        if (dirname(dir) === dir) {
            return undefined;
        }
    }
}

function asked(manifest, from) {
    const each = (names, optional) =>
        Object.keys(names ?? {})
            .filter((name) => !name.startsWith(OURS))
            .map((name) => ({ name, from, optional }));

    return [...each(manifest.dependencies, false), ...each(manifest.optionalDependencies, true)];
}

/**
 * The third-party packages the manifests in these folders need at run time, and the ones those
 * need in turn, as node would find them on disk. A package of the repo is not followed: its own
 * folder is handed in when the app bundles it. An optional one the disk lacks is skipped; a
 * required one fails, since the notices would leave it out.
 *
 * @param {readonly string[]} dirs folders that hold a `package.json`
 */
export function dependencyRoots(dirs) {
    const found = new Set();
    const queue = dirs.flatMap((dir) => asked(readJson(join(dir, 'package.json')), dir));

    while (queue.length > 0) {
        const { name, from, optional } = queue.shift();
        const root = lookup(name, from);

        if (root === undefined && !optional) {
            throw new Error(`${name}, asked for from ${from}, is not installed.`);
        }

        if (root !== undefined && !found.has(root)) {
            found.add(root);
            queue.push(...asked(readJson(join(root, 'package.json')), root));
        }
    }

    return [...found].sort();
}

/** What stands for the text of a package that ships none: the license its manifest names, if any. */
function bare(license) {
    return license === 'UNKNOWN'
        ? 'The package ships no license file and its manifest names no license.'
        : `The package ships no license file; its manifest declares ${license}.`;
}

function section(entry) {
    const head = [`${entry.name} ${entry.version}`, `License: ${entry.license}`];
    const body =
        entry.texts.length === 0
            ? [bare(entry.license)]
            : entry.texts.flatMap(({ file, text }) => [`[${file}]`, '', text, '']);

    if (entry.source !== undefined) {
        head.push(`Source: ${entry.source}`);
    }

    return [RULE, ...head, THIN, '', ...body].join('\n');
}

/** The notices file: what the app is under, then each package once, by name and version. */
export function noticesText(entries) {
    const unique = new Map(entries.map((entry) => [`${entry.name}@${entry.version}`, entry]));
    const sorted = [...unique.values()].sort(
        (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
    );

    return `${[PREAMBLE, ...sorted.map(section)].join('\n')}\n`;
}
