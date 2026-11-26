import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** The apps a tag can name, by the folder each one lives in, and the name a person sees. */
const PRODUCTS = { async: 'Mandor Realtime', sync: 'Mandor Request' };

/** A number of a version, which semver writes with no leading zero. */
const NUMBER = '(?:0|[1-9]\\d*)';

/**
 * `sync-v1.2.3` or `sync-v1.2.3-beta.4`. The beta is the only prerelease: it is the one channel
 * the updater follows besides the stable, and any other name would write files nobody reads.
 */
const TAG = new RegExp(
    `^(?<app>[a-z]+)-v(?<version>${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-beta\\.(?<beta>${NUMBER}))?)$`,
    'u',
);

function readTag(tag) {
    const match = TAG.exec(tag);

    if (match === null || !Object.hasOwn(PRODUCTS, match.groups.app)) {
        return undefined;
    }

    const { app, version, beta } = match.groups;

    return {
        app,
        product: PRODUCTS[app],
        version,
        prerelease: beta !== undefined,
        feed: `${app}-feed`,
    };
}

/** What a release tag names: the app, its version, whether it is a beta and the feed it fills. */
export function parseReleaseTag(tag) {
    const release = readTag(tag);

    if (release === undefined) {
        throw new Error(`"${tag}" is no release tag: it reads <async|sync>-v<x.y.z>[-beta.<n>].`);
    }

    return release;
}

/** A version as numbers to compare in order; a stable comes after every beta of its version. */
function rankOf(version) {
    const [core = '', beta] = version.split('-beta.');

    return [...core.split('.').map(Number), beta === undefined ? Infinity : Number(beta)];
}

function compareVersions(left, right) {
    const a = rankOf(left);
    const b = rankOf(right);
    const at = a.findIndex((part, index) => part !== b[index]);

    return at === -1 ? 0 : (a[at] ?? 0) - (b[at] ?? 0);
}

/**
 * The release the notes of a tag start from: the newest earlier one of the same app. A stable
 * counts from the previous stable, so its notes cover every beta that led to it.
 */
export function previousTag(tag, tags) {
    const current = parseReleaseTag(tag);
    const earlier = tags
        .map((name) => ({ name, release: readTag(name) }))
        .filter(({ release }) => release !== undefined && release.app === current.app)
        .filter(({ release }) => compareVersions(release.version, current.version) < 0)
        .filter(({ release }) => current.prerelease || !release.prerelease)
        .sort((left, right) => compareVersions(right.release.version, left.release.version));

    return earlier[0]?.name;
}

/** The lines the workflow appends to `$GITHUB_OUTPUT`, one `key=value` each. */
export function releaseOutputs(tag, tags) {
    const release = parseReleaseTag(tag);
    const values = { ...release, previous: previousTag(tag, tags) ?? '' };

    return Object.entries(values)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('\n');
}

function main(tag) {
    const listed = spawnSync('git', ['tag', '--list'], { encoding: 'utf8' });

    if (listed.status !== 0) {
        throw new Error(`git tag --list failed with ${String(listed.status)}.`);
    }

    process.stdout.write(`${releaseOutputs(tag, listed.stdout.split('\n').filter(Boolean))}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main(process.argv[2] ?? '');
}
