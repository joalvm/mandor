import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { downloadsMarkup } from './downloads-markup.mjs';
import { downloadsOf } from './downloads.mjs';
import { alternatesOf, languagesOf, switcherOf } from './languages.mjs';
import { escapeHtml, escapeWords, fill, parsePage } from './page-source.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Where GitHub Pages serves the site; canonical and alternate links name it in full. */
export const SITE_URL = 'https://joalvm.github.io/mandor/';

/** What the site serves from its source folder as it is. */
const ASSETS = ['styles.css', 'fonts', 'shots', 'glyphs'];

/** The icons of the apps, taken from the apps so the page never shows an outdated one. */
const ICONS = [
    { from: 'apps/sync/resources/icon.png', to: 'icons/request.png' },
    { from: 'apps/async/resources/icon.png', to: 'icons/realtime.png' },
];

/**
 * The version of the newest release of each app, for the examples of the docs that name a file,
 * so they always name the file the page offers; `x.y.z` for an app with no release yet.
 */
function latestOf(downloads) {
    return Object.fromEntries(
        Object.entries(downloads).map(([app, offer]) => [
            app,
            escapeHtml(offer?.version ?? 'x.y.z'),
        ]),
    );
}

/** The address of a page from the folder of its language: the index is the folder itself. */
function pathOf(slug) {
    return slug === 'index' ? '' : `${slug}.html`;
}

function fileOf(slug) {
    return slug === 'index' ? 'index.html' : `${slug}.html`;
}

/** One page inside the layout, with every gap of both filled. */
function render({ layout, page, values, place, name }) {
    const body = fill(page.body, values, name);

    return fill(
        layout,
        {
            ...values,
            ...place,
            title: escapeHtml(page.fields.title),
            description: escapeHtml(page.fields.description),
            content: body,
        },
        'site/layout.html',
    );
}

async function slugsOf(folder) {
    const names = await readdir(folder);

    return names
        .filter((name) => name.endsWith('.html'))
        .map((name) => name.slice(0, -'.html'.length))
        .sort();
}

/**
 * The pages every language has: those of the first one. A language with a page more or a page less
 * stops the build, so no switcher or alternate link ever leads to a page that is not there.
 */
async function slugsOfAll(siteDir, languages) {
    const [first, ...others] = languages;
    const slugs = await slugsOf(join(siteDir, 'pages', first.code));

    for (const { code } of others) {
        const own = await slugsOf(join(siteDir, 'pages', code));

        if (own.join() !== slugs.join()) {
            throw new Error(
                `site/pages/${code}/ has not the pages of site/pages/${first.code}/: ${own.join(', ')}.`,
            );
        }
    }

    return slugs;
}

/** The pages of one language, each written where its address says. */
async function writeLanguage({
    siteDir,
    outDir,
    layout,
    words,
    downloads,
    languages,
    language,
    slugs,
}) {
    const { code } = language;
    const values = {
        lang: code,
        dir: language.dir,
        root: language.root,
        index: './',
        home: '',
        t: escapeWords(words[code]),
        downloads: downloadsMarkup(downloads, { words: words[code].downloads, lang: code }),
        latest: latestOf(downloads),
    };

    await mkdir(join(outDir, language.folder), { recursive: true });

    for (const slug of slugs) {
        const name = `site/pages/${code}/${slug}.html`;
        const source = await readFile(join(siteDir, 'pages', code, `${slug}.html`), 'utf8');
        const page = parsePage(source, name);
        const place = {
            canonical: `${SITE_URL}${language.folder}${pathOf(slug)}`,
            alternates: alternatesOf(languages, (to) => `${SITE_URL}${to.folder}${pathOf(slug)}`),
            languages: switcherOf(
                languages,
                language,
                (to) => `${language.root}${to.folder}${pathOf(slug)}` || './',
            ),
        };

        await writeFile(
            join(outDir, language.folder, fileOf(slug)),
            render({ layout, page, values, place, name }),
        );
    }
}

/**
 * The page GitHub Pages shows for an address it does not have, in the first language: it can be
 * served from any depth, so every address in it starts at the root of the site.
 */
async function writeMissing({ siteDir, outDir, layout, words, languages }) {
    const page = parsePage(await readFile(join(siteDir, '404.html'), 'utf8'), 'site/404.html');
    const [first] = languages;
    const root = new URL(SITE_URL).pathname;
    const values = {
        lang: first.code,
        dir: first.dir,
        root,
        index: root,
        home: root,
        t: escapeWords(words[first.code]),
    };
    const place = {
        canonical: SITE_URL,
        alternates: alternatesOf(languages, (to) => `${SITE_URL}${to.folder}`),
        languages: switcherOf(languages, first, (to) => `${root}${to.folder}`),
    };

    await writeFile(
        join(outDir, '404.html'),
        render({ layout, page, values, place, name: 'site/404.html' }),
    );
}

/**
 * Writes the site into `outDir`: the pages of each language around the layout, the 404 page,
 * the shared files and the icons of the apps.
 *
 * @param {{ siteDir?: string; outDir: string; releases: readonly object[]; repoRoot?: string }} options
 */
export async function buildSite({
    siteDir = join(REPO_ROOT, 'site'),
    outDir,
    releases,
    repoRoot = REPO_ROOT,
}) {
    const layout = await readFile(join(siteDir, 'layout.html'), 'utf8');
    const words = JSON.parse(await readFile(join(siteDir, 'i18n.json'), 'utf8'));
    const downloads = downloadsOf(releases);
    const languages = languagesOf(words);
    const slugs = await slugsOfAll(siteDir, languages);

    await rm(outDir, { force: true, recursive: true });
    await mkdir(outDir, { recursive: true });

    for (const language of languages) {
        await writeLanguage({
            siteDir,
            outDir,
            layout,
            words,
            downloads,
            languages,
            language,
            slugs,
        });
    }

    await writeMissing({ siteDir, outDir, layout, words, languages });

    for (const asset of ASSETS) {
        await cp(join(siteDir, asset), join(outDir, asset), { recursive: true });
    }

    for (const { from, to } of ICONS) {
        await mkdir(dirname(join(outDir, to)), { recursive: true });
        await cp(join(repoRoot, from), join(outDir, to));
    }
}

/** The releases of the repository as the API lists them, one JSON object per line. */
function releasesFromGitHub() {
    const fields =
        '.[] | {tag_name, draft, prerelease, html_url, assets: [.assets[] | {name, size, browser_download_url}]}';
    const output = execFileSync(
        'gh',
        ['api', '--paginate', 'repos/joalvm/mandor/releases', '--jq', fields],
        { encoding: 'utf8' },
    );

    return output
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line));
}

async function main() {
    const { values } = parseArgs({
        options: { releases: { type: 'string' }, out: { type: 'string' } },
    });
    const releases =
        values.releases === undefined
            ? releasesFromGitHub()
            : JSON.parse(await readFile(values.releases, 'utf8'));
    const outDir = values.out ?? join(REPO_ROOT, 'site/out');

    await buildSite({ outDir, releases });
    process.stdout.write(`Site written to ${outDir}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
