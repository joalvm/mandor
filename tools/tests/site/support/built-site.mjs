import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE_URL } from '../../../site/build-site.mjs';

/** The source of the site, as the build reads it. */
export const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../site');

/** The words of the site; its languages are its keys, the first one at the root. */
export const WORDS = JSON.parse(await readFile(join(SITE_DIR, 'i18n.json'), 'utf8'));
export const CODES = Object.keys(WORDS);

/** Every tag that names a place in a page, and the addresses it holds. */
const TAG = /<(?<name>a|link|img|source|script)\b(?<attrs>[^>]*)>/giu;
const ADDRESS = /\b(?<attr>href|src|srcset)="(?<value>[^"]*)"/giu;

/** The pages a build wrote, by their address from the root of the site. */
export async function pagesOf(outDir) {
    const files = await readdir(outDir, { recursive: true });

    return files
        .map((file) => file.replaceAll('\\', '/'))
        .filter((file) => file.endsWith('.html'))
        .sort();
}

/** The URLs an attribute names: one for href and src, one per candidate for srcset. */
function urlsOf({ attr, value }) {
    const candidates = attr.toLowerCase() === 'srcset' ? value.split(',') : [value];

    return candidates.map((candidate) => candidate.trim().split(/\s/u)[0]);
}

export function addressesOf(html) {
    return [...html.matchAll(TAG)].flatMap(({ groups }) =>
        [...groups.attrs.matchAll(ADDRESS)].flatMap((address) =>
            urlsOf(address.groups).map((url) => ({ tag: groups.name.toLowerCase(), url })),
        ),
    );
}

/** The file and fragment of the site an address leads to, or null when it leaves the site. */
function placeOf(page, url) {
    const resolved = new URL(url.replaceAll('&amp;', '&'), `${SITE_URL}${page}`);
    const address = `${resolved.origin}${resolved.pathname}`;

    if (!address.startsWith(SITE_URL)) {
        return null;
    }

    const path = address.slice(SITE_URL.length);
    const file = path === '' || path.endsWith('/') ? `${path}index.html` : path;

    return { file, fragment: decodeURIComponent(resolved.hash.slice(1)) };
}

export async function exists(path) {
    return stat(path).then(
        () => true,
        () => false,
    );
}

/** Each address of a page that leads nowhere: a missing file, a missing id, or a foreign resource. */
export async function brokenOf(outDir, page) {
    const html = await readFile(join(outDir, page), 'utf8');
    const broken = [];

    for (const { tag, url } of addressesOf(html)) {
        const place = placeOf(page, url);

        if (place === null) {
            broken.push(...(tag === 'a' ? [] : [`${page}: ${tag} loads ${url}`]));
            continue;
        }

        const target = join(outDir, place.file);
        const found = (await exists(target)) && (await hasId(target, place.fragment));

        broken.push(...(found ? [] : [`${page}: ${url}`]));
    }

    return broken;
}

async function hasId(file, fragment) {
    if (fragment === '') {
        return true;
    }

    return (await readFile(file, 'utf8')).includes(` id="${fragment}"`);
}
