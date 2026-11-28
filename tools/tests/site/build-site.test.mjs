import { cp, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildSite, SITE_URL } from '../../site/build-site.mjs';

const BASE = 'https://github.com/joalvm/mandor/releases/download';

const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../site');

/** The words of the site; its languages are its keys, the first one at the root. */
const WORDS = JSON.parse(await readFile(join(SITE_DIR, 'i18n.json'), 'utf8'));
const CODES = Object.keys(WORDS);

/** The language a built page is in, from the folder it sits in. */
function languageOf(page) {
    const folder = page.split('/')[0];

    return CODES.slice(1).find((code) => code.toLowerCase() === folder) ?? CODES[0];
}

/** Every tag that names a place in a page, and the addresses it holds. */
const TAG = /<(?<name>a|link|img|source|script)\b(?<attrs>[^>]*)>/giu;
const ADDRESS = /\b(?<attr>href|src|srcset)="(?<value>[^"]*)"/giu;

/** A release as the API lists it, with an installer per system and its checksums. */
function release(tag) {
    const [app = '', version = ''] = tag.split('-v');
    const product = `Mandor-${app === 'request' ? 'Request' : 'Realtime'}-${version}`;
    const names = [
        `${product}-win-x64.exe`,
        `${product}-mac-arm64.dmg`,
        `${product}-linux-x86_64.AppImage`,
        'SHA256SUMS',
        `${product}-THIRD-PARTY-NOTICES.txt`,
    ];

    return {
        tag_name: tag,
        draft: false,
        prerelease: tag.includes('-beta.'),
        html_url: `https://github.com/joalvm/mandor/releases/tag/${tag}`,
        assets: names.map((name) => ({
            name,
            size: 98_765_432,
            browser_download_url: `${BASE}/${tag}/${name}`,
        })),
    };
}

async function pagesOf(outDir) {
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

function addressesOf(html) {
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

async function exists(path) {
    return stat(path).then(
        () => true,
        () => false,
    );
}

/** Each address of a page that leads nowhere: a missing file, a missing id, or a foreign resource. */
async function brokenOf(outDir, page) {
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

describe('the built site', () => {
    let outDir = '';
    let pages = [];

    beforeAll(async () => {
        outDir = await mkdtemp(join(tmpdir(), 'mandor-site-'));
        await buildSite({
            outDir,
            releases: [
                release('request-v0.1.0'),
                release('request-v0.2.0-beta.1'),
                release('realtime-v0.1.0-beta.2'),
                release('realtime-v0.1.0'),
            ],
        });
        pages = await pagesOf(outDir);
    });

    afterAll(async () => {
        await rm(outDir, { recursive: true, force: true });
    });

    it('has the same pages in every language, and the 404 page', () => {
        const first = pages.filter((page) => !page.includes('/') && page !== '404.html');

        expect(CODES.slice(0, 2)).toEqual(['en', 'es']);
        expect(first).toContain('index.html');
        expect(first.length).toBeGreaterThan(5);

        for (const code of CODES.slice(1)) {
            const folder = `${code.toLowerCase()}/`;

            expect(pages.filter((page) => page.startsWith(folder))).toEqual(
                first.map((page) => `${folder}${page}`),
            );
        }

        expect(pages).toContain('404.html');
    });

    it('names every page in every language and offers them all in one menu', async () => {
        for (const page of pages) {
            const html = await readFile(join(outDir, page), 'utf8');

            for (const code of CODES) {
                expect(html, page).toMatch(
                    new RegExp(`<link rel="alternate" hreflang="${code}" `, 'u'),
                );
                expect(html, page).toMatch(
                    new RegExp(`<a href="[^"]*" hreflang="${code}" lang="${code}" `, 'u'),
                );
            }

            expect(html, page).toContain('<link rel="alternate" hreflang="x-default" ');
            expect(html.match(/ aria-current="true"/gu), page).toHaveLength(1);
        }
    });

    it('leads every address of the site to a file and id it has, and loads nothing from outside', async () => {
        const broken = await Promise.all(pages.map((page) => brokenOf(outDir, page)));

        expect(broken.flat()).toEqual([]);
    });

    it('writes each page in its language, under the policy, with one title and no gap left', async () => {
        for (const page of pages) {
            const html = await readFile(join(outDir, page), 'utf8');
            const code = languageOf(page);

            expect(html, page).toContain(`<html lang="${code}" dir="${WORDS[code].language.dir}">`);
            expect(html, page).toContain(`http-equiv="Content-Security-Policy"`);
            expect(html, page).toContain(`script-src 'none'`);
            expect(html.match(/<h1[\s>]/gu), page).toHaveLength(1);
            expect(html, page).not.toContain('{{');
            expect(html, page).not.toMatch(/\sstyle="/u);
            expect(html, page).not.toMatch(/<script\b/u);
        }
    });

    it('starts every address of the 404 page at the root, since it is served from any depth', async () => {
        const html = await readFile(join(outDir, '404.html'), 'utf8');
        const relative = addressesOf(html).filter(({ url }) => !/^(?:\/|https:|#)/u.test(url));

        expect(relative).toEqual([]);
    });

    it('offers the installers of the newest release of each app, with its checksums and source', async () => {
        const html = await readFile(join(outDir, 'index.html'), 'utf8');
        const request = `${BASE}/request-v0.2.0-beta.1`;

        expect(html).toContain('class="downloads"');
        expect(html).toContain(`${request}/Mandor-Request-0.2.0-beta.1-win-x64.exe`);
        expect(html).toContain(`${request}/SHA256SUMS`);
        expect(html).toContain('https://github.com/joalvm/mandor/tree/request-v0.2.0-beta.1');
        expect(html).toContain(`${BASE}/realtime-v0.1.0/Mandor-Realtime-0.1.0-mac-arm64.dmg`);
        expect(html).not.toContain('request-v0.1.0/');
        expect(html).not.toContain('realtime-v0.1.0-beta.2');
    });

    it('names in the examples of the docs the files of the newest release', async () => {
        for (const page of [
            'install.html',
            'licenses.html',
            'es/install.html',
            'es/licenses.html',
        ]) {
            const html = await readFile(join(outDir, page), 'utf8');

            expect(html, page).toContain('Mandor-Request-0.2.0-beta.1-');
            expect(html, page).not.toContain('Mandor-Request-0.1.0-');
        }
    });

    it('carries the icons of both apps, the font and its license', async () => {
        for (const file of [
            'icons/request.png',
            'icons/realtime.png',
            'fonts/inter.woff2',
            'fonts/OFL.txt',
        ]) {
            expect(await exists(join(outDir, file)), file).toBe(true);
        }
    });
});

/** A copy of the site's source with one language more, written right to left from the first one's pages. */
async function siteWithArabic() {
    const siteDir = await mkdtemp(join(tmpdir(), 'mandor-site-src-'));

    await cp(SITE_DIR, siteDir, { recursive: true, filter: (from) => !/[\\/]out$/u.test(from) });
    await cp(join(siteDir, 'pages', CODES[0]), join(siteDir, 'pages', 'ar'), { recursive: true });

    const words = {
        ...WORDS,
        ar: { ...WORDS[CODES[0]], language: { name: 'العربية', dir: 'rtl' } },
    };

    await writeFile(join(siteDir, 'i18n.json'), JSON.stringify(words));

    return siteDir;
}

describe('a language added to the site', () => {
    let siteDir = '';
    let outDir = '';

    beforeAll(async () => {
        siteDir = await siteWithArabic();
        outDir = await mkdtemp(join(tmpdir(), 'mandor-site-'));
    });

    afterAll(async () => {
        await rm(siteDir, { recursive: true, force: true });
        await rm(outDir, { recursive: true, force: true });
    });

    it('gets a folder of its own, its direction, and a place in every head and menu', async () => {
        await buildSite({ siteDir, outDir, releases: [] });
        const pages = await pagesOf(outDir);
        const arabic = await readFile(join(outDir, 'ar/index.html'), 'utf8');
        const english = await readFile(join(outDir, 'docs.html'), 'utf8');

        expect(arabic).toContain('<html lang="ar" dir="rtl">');
        expect(arabic).toMatch(
            /<a href="\.\.\/ar\/" hreflang="ar" lang="ar" dir="rtl" aria-current="true">/u,
        );
        expect(english).toContain(
            `<link rel="alternate" hreflang="ar" href="${SITE_URL}ar/docs.html" />`,
        );
        expect(english).toMatch(/<a href="ar\/docs\.html" hreflang="ar" lang="ar" dir="rtl">/u);

        const broken = await Promise.all(pages.map((page) => brokenOf(outDir, page)));

        expect(broken.flat()).toEqual([]);
    });

    it('stops the build when it lacks a page of the first language', async () => {
        await rm(join(siteDir, 'pages', 'ar', 'docs.html'));

        await expect(buildSite({ siteDir, outDir, releases: [] })).rejects.toThrow(
            'site/pages/ar/ has not the pages of site/pages/en/',
        );
    });

    it('stops the build when it names no direction', async () => {
        const words = { ...WORDS, ar: { ...WORDS[CODES[0]], language: { name: 'العربية' } } };

        await writeFile(join(siteDir, 'i18n.json'), JSON.stringify(words));

        await expect(buildSite({ siteDir, outDir, releases: [] })).rejects.toThrow(
            'site/i18n.json gives ar no direction',
        );
    });
});

describe('a site with nothing released', () => {
    it('leads each app to where its releases will be', async () => {
        const outDir = await mkdtemp(join(tmpdir(), 'mandor-site-'));

        try {
            await buildSite({ outDir, releases: [] });
            const html = await readFile(join(outDir, 'es/index.html'), 'utf8');

            expect(html).toContain('releases?q=request-v&amp;expanded=true');
            expect(html).toContain('releases?q=realtime-v&amp;expanded=true');
        } finally {
            await rm(outDir, { recursive: true, force: true });
        }
    });
});
