import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildSite } from '../../site/build-site.mjs';

import { addressesOf, brokenOf, CODES, exists, pagesOf, WORDS } from './support/built-site.mjs';

const BASE = 'https://github.com/joalvm/mandor/releases/download';

/** The language a built page is in, from the folder it sits in. */
function languageOf(page) {
    const folder = page.split('/')[0];

    return CODES.slice(1).find((code) => code.toLowerCase() === folder) ?? CODES[0];
}

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
