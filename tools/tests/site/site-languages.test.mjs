import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildSite, SITE_URL } from '../../site/build-site.mjs';

import { brokenOf, CODES, pagesOf, SITE_DIR, WORDS } from './support/built-site.mjs';

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
