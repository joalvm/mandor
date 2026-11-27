/**
 * The apps a release can name, by the name a person sees: each one with the folder it lives in,
 * which keeps the name it has inside the code.
 */
const APPS = {
    realtime: { app: 'async', product: 'Mandor Realtime' },
    request: { app: 'sync', product: 'Mandor Request' },
};

/** A number of a version, which semver writes with no leading zero. */
const NUMBER = '(?:0|[1-9]\\d*)';

/**
 * `request-v1.2.3` or `request-v1.2.3-beta.4`. The beta is the only prerelease: it is the one channel
 * the updater follows besides the stable, and any other name would write files nobody reads.
 */
const TAG = new RegExp(
    `^(?<name>[a-z]+)-v(?<version>${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-beta\\.(?<beta>${NUMBER}))?)$`,
    'u',
);

/** The app a person names, or a refusal that lists the ones there are. */
export function appNamed(name) {
    if (!Object.hasOwn(APPS, name)) {
        throw new Error(`"${name}" is no app: it is realtime or request.`);
    }

    return { name, ...APPS[name], feed: `${name}-feed` };
}

/** What a tag names, or nothing when it is not the tag of a release. */
export function releaseOf(tag) {
    const match = TAG.exec(tag);

    if (match === null || !Object.hasOwn(APPS, match.groups.name)) {
        return undefined;
    }

    const { name, version, beta } = match.groups;

    return { ...appNamed(name), version, prerelease: beta !== undefined };
}

/** What a release tag names: the app, its version, whether it is a beta and the feed it fills. */
export function parseReleaseTag(tag) {
    const release = releaseOf(tag);

    if (release === undefined) {
        throw new Error(
            `"${tag}" is no release tag: it reads <realtime|request>-v<x.y.z>[-beta.<n>].`,
        );
    }

    return release;
}

/** A version as numbers to compare in order; a stable comes after every beta of its version. */
function rankOf(version) {
    const [core = '', beta] = version.split('-beta.');

    return [...core.split('.').map(Number), beta === undefined ? Infinity : Number(beta)];
}

/** Below zero when `left` comes first, above when `right` does, zero for the same version. */
export function compareVersions(left, right) {
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
        .map((name) => ({ name, release: releaseOf(name) }))
        .filter(({ release }) => release !== undefined && release.app === current.app)
        .filter(({ release }) => compareVersions(release.version, current.version) < 0)
        .filter(({ release }) => current.prerelease || !release.prerelease)
        .sort((left, right) => compareVersions(right.release.version, left.release.version));

    return earlier[0]?.name;
}
