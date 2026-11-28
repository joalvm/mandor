import { appNamed } from '../publish/release-tag.mjs';
import { escapeHtml } from './page-source.mjs';

/** The systems of the page, in the order of its tabs; the first one is picked when it opens. */
const SYSTEMS = ['windows', 'macos', 'linux'];

/** The apps of the page, in the order each tab lists them. */
const APPS = ['request', 'realtime'];

/** Where the releases of an app are listed when the page has none of its own to offer. */
const RELEASES = 'https://github.com/joalvm/mandor/releases';

function link(href, text) {
    return `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
}

function sizeOf(bytes, lang) {
    const megabytes = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(
        bytes / 1_000_000,
    );

    return `${megabytes} MB`;
}

/** One installer as a band: what machine it is for, what kind of file it is, its name and size. */
function bandOf(file, { words, lang }) {
    const arch = words.arch[`${file.system}-${file.arch}`];
    const note = [file.name, sizeOf(file.size, lang)].join(' · ');

    return [
        `<li><a class="band" href="${escapeHtml(file.url)}">`,
        `<span class="band-arch">${escapeHtml(arch)}</span>`,
        `<span class="band-title">${escapeHtml(words.kind[file.kind])}`,
        `<span class="band-note">${escapeHtml(note)}</span></span>`,
        `<span class="band-action">${escapeHtml(words.download)}</span>`,
        '</a></li>',
    ].join('');
}

/** The band of an app with nothing released yet: it leads to where its releases will be. */
function emptyBandOf(app, { words }) {
    const href = `${RELEASES}?q=${app}-v&expanded=true`;

    return [
        `<li><a class="band" href="${escapeHtml(href)}">`,
        '<span class="band-arch"></span>',
        `<span class="band-title">${escapeHtml(words.none)}</span>`,
        `<span class="band-action">${escapeHtml(words.releases)}</span>`,
        '</a></li>',
    ].join('');
}

/** The name of an app over its installers, with the version they are of when there is one. */
function groupTitleOf(app, offer) {
    const name = appNamed(app).product;
    const title = offer === null ? name : `${name} ${offer.version}`;

    return `<h4 class="group-title">${escapeHtml(title)}</h4>`;
}

/** What lets a person check what they downloaded, next to the downloads, as the AGPL asks. */
function factsOf(offer, { words }) {
    const facts = [
        offer.sums === null ? '' : link(offer.sums, words.sums),
        offer.notices === null ? '' : link(offer.notices, words.notices),
        link(offer.source, `${words.source} ${offer.tag}`),
        link(offer.page, words.page),
    ].filter((fact) => fact !== '');

    return `<p class="facts">${facts.join(' ')}</p>`;
}

/** The installers of one app for one system, or the way to its releases when it has none. */
function groupOf(app, system, offer, context) {
    const head = `<div class="group" data-app="${app}">${groupTitleOf(app, offer)}`;

    if (offer === null) {
        return `${head}<ul class="bands">${emptyBandOf(app, context)}</ul></div>`;
    }

    const bands = offer.files
        .filter((file) => file.system === system)
        .map((file) => bandOf(file, context));

    return [
        head,
        `<ul class="bands">${bands.join('')}</ul>`,
        factsOf(offer, context),
        '</div>',
    ].join('');
}

function tabOf(system, { words }) {
    const { name, note } = words.systems[system];

    return [
        `<label class="tab" for="sys-${system}">`,
        `<span class="tab-name">${escapeHtml(name)}</span>`,
        `<span class="tab-note">${escapeHtml(note)}</span>`,
        '</label>',
    ].join('');
}

function pickOf(system, index) {
    const checked = index === 0 ? ' checked' : '';

    return `<input class="pick" type="radio" name="system" id="sys-${system}" value="${system}"${checked}>`;
}

/**
 * The downloads of the page as HTML: a tab per system, each showing the installers of both apps
 * for it, with no script; the picked radio shows its panel through CSS. A browser that cannot pick
 * through CSS shows every panel, each under the name of its system.
 *
 * @param {Record<string, object | null>} downloads the newest release of each app, as
 *   `downloadsOf` gives them
 * @param {{ words: object; lang: string }} context the words of the page and its language
 */
export function downloadsMarkup(downloads, context) {
    const panels = SYSTEMS.map((system) => {
        const groups = APPS.map((app) => groupOf(app, system, downloads[app], context));
        const title = escapeHtml(context.words.systems[system].name);

        return `<div class="panel" data-system="${system}"><h3 class="panel-title">${title}</h3>${groups.join('')}</div>`;
    });

    return [
        '<div class="downloads">',
        SYSTEMS.map(pickOf).join(''),
        `<div class="tabs">${SYSTEMS.map((system) => tabOf(system, context)).join('')}</div>`,
        `<div class="panels">${panels.join('')}</div>`,
        '</div>',
    ].join('');
}
