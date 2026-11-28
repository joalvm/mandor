import { compareVersions, releaseOf } from '../publish/release-tag.mjs';

const REPOSITORY = 'https://github.com/joalvm/mandor';

/**
 * The installers a person downloads, by how the name of each ends, in the order the page lists
 * them. The zip of macOS, the blockmaps and the update files are for the updater, not a person.
 */
const INSTALLERS = [
    { suffix: '-win-x64.exe', system: 'windows', arch: 'x64', kind: 'exe' },
    { suffix: '-win-arm64.exe', system: 'windows', arch: 'arm64', kind: 'exe' },
    { suffix: '-mac-arm64.dmg', system: 'macos', arch: 'arm64', kind: 'dmg' },
    { suffix: '-mac-x64.dmg', system: 'macos', arch: 'x64', kind: 'dmg' },
    { suffix: '-linux-x86_64.AppImage', system: 'linux', arch: 'x64', kind: 'AppImage' },
    { suffix: '-linux-arm64.AppImage', system: 'linux', arch: 'arm64', kind: 'AppImage' },
    { suffix: '-linux-amd64.deb', system: 'linux', arch: 'x64', kind: 'deb' },
    { suffix: '-linux-arm64.deb', system: 'linux', arch: 'arm64', kind: 'deb' },
];

const NOTICES = '-THIRD-PARTY-NOTICES.txt';

/** The apps of the page, by the name their release tags carry. */
const APPS = ['request', 'realtime'];

function urlOf(assets, matches) {
    return assets.find(({ name }) => matches(name))?.browser_download_url ?? null;
}

function filesOf(assets) {
    return INSTALLERS.flatMap(({ suffix, system, arch, kind }) => {
        const found = assets.find(({ name }) => name.endsWith(suffix));

        return found === undefined
            ? []
            : [
                  {
                      system,
                      arch,
                      kind,
                      name: found.name,
                      size: found.size,
                      url: found.browser_download_url,
                  },
              ];
    });
}

/** A release as the page offers it: its installers and what lets a person check them. */
function offerOf(release, version) {
    const tag = release.tag_name;

    return {
        version,
        tag,
        page: release.html_url,
        source: `${REPOSITORY}/tree/${tag}`,
        sums: urlOf(release.assets, (name) => name === 'SHA256SUMS'),
        notices: urlOf(release.assets, (name) => name.endsWith(NOTICES)),
        files: filesOf(release.assets),
    };
}

/**
 * @typedef {{ name: string; size: number; browser_download_url: string }} Asset
 * @typedef {{ tag_name: string; draft: boolean; html_url: string; assets: Asset[] }} Release
 */

/**
 * What the page offers of each app: its newest release, stable or beta, so the page always leads
 * to the latest one; null for an app with none yet. Drafts and the feeds of the updater are no
 * release a person downloads.
 *
 * @param {readonly Release[]} releases as the API of GitHub lists them
 */
export function downloadsOf(releases) {
    const known = releases
        .filter((release) => !release.draft)
        .map((release) => ({ release, named: releaseOf(release.tag_name) }))
        .filter(({ named }) => named !== undefined);

    return Object.fromEntries(
        APPS.map((app) => {
            const [newest] = known
                .filter(({ named }) => named.name === app)
                .sort((a, b) => compareVersions(b.named.version, a.named.version));

            return [
                app,
                newest === undefined ? null : offerOf(newest.release, newest.named.version),
            ];
        }),
    );
}
