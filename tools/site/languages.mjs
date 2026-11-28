import { escapeHtml } from './page-source.mjs';

/** A code a language can be served under: `pt`, `pt-BR`, `zh-Hans`. */
const CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u;

/** The ways a language is written, as the `dir` attribute names them. */
const DIRECTIONS = new Set(['ltr', 'rtl']);

/**
 * The languages of the site, in the order of `site/i18n.json`. The first one sits at the root and
 * stands for anyone whose language the site does not have; each other one has a folder of its own,
 * named by its code in lower case, and reaches the shared files one level up.
 */
export function languagesOf(words) {
    return Object.entries(words).map(([code, tree], position) => {
        if (!CODE.test(code)) {
            throw new Error(`site/i18n.json has a language with no valid code: ${code}.`);
        }

        if (!DIRECTIONS.has(tree.language?.dir)) {
            throw new Error(`site/i18n.json gives ${code} no direction: ltr or rtl.`);
        }

        const first = position === 0;

        return {
            code,
            name: tree.language.name,
            dir: tree.language.dir,
            folder: first ? '' : `${code.toLowerCase()}/`,
            root: first ? '' : '../',
        };
    });
}

/** The links of the head that name the page in every language, the first one as the default. */
export function alternatesOf(languages, urlFor) {
    const link = (hreflang, language) =>
        `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(urlFor(language))}" />`;
    const links = [
        ...languages.map((language) => link(language.code, language)),
        link('x-default', languages[0]),
    ];

    return links.join('\n        ');
}

/** The entries of the language menu: the page in each language, the one on screen marked. */
export function switcherOf(languages, current, hrefFor) {
    const entries = languages.map((language) => {
        const mark = language.code === current.code ? ' aria-current="true"' : '';

        return `<li><a href="${escapeHtml(hrefFor(language))}" hreflang="${language.code}" lang="${language.code}" dir="${language.dir}"${mark}>${escapeHtml(language.name)}</a></li>`;
    });

    return entries.join('\n                    ');
}
