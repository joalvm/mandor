import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { appPaths } from './app-paths.mjs';
import { bumpOf, changesOf, releaseNotes } from './release-changes.mjs';
import { appNamed, compareVersions, previousTag, releaseOf } from './release-tag.mjs';

/** A version a person forces on a beta: the three numbers, with no prerelease of its own. */
const CORE = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

const BUMPS = {
    minor: ([major, minor]) => `${major}.${minor + 1}.0`,
    patch: ([major, minor, patch]) => `${major}.${minor}.${patch + 1}`,
};

function bumped(version, bump) {
    return BUMPS[bump](version.split('.').map(Number));
}

function newest(releases, keep) {
    return releases
        .filter(keep)
        .sort((left, right) => compareVersions(right.version, left.version))[0];
}

function forcedTarget(forced, stable) {
    if (!CORE.test(forced)) {
        throw new Error(`"${forced}" is no version to aim a beta at: it reads <x.y.z>.`);
    }

    if (stable !== undefined && compareVersions(forced, stable.version) <= 0) {
        throw new Error(`${forced} does not come after ${stable.tag}, the stable out already.`);
    }

    return forced;
}

/** The stable a beta leads to: the one the changes since the last stable earn, or the forced one. */
function targetOf({ app, stable, forced, bump }) {
    if (forced !== '') {
        return forcedTarget(forced, stable);
    }

    if (bump === undefined) {
        throw new Error(
            `Nothing new for ${app.name} since ${stable?.tag ?? 'its start'}: no feat, fix or dependency it ships.`,
        );
    }

    return bumped(stable?.version ?? '0.0.0', bump);
}

function nextBeta(core, releases) {
    const numbers = releases
        .filter((release) => release.version.startsWith(`${core}-beta.`))
        .map((release) => Number(release.version.split('-beta.')[1]));

    return `${core}-beta.${String(Math.max(0, ...numbers) + 1)}`;
}

function shaOf(releases, tag) {
    return releases.find((release) => release.tag === tag)?.sha;
}

/**
 * A beta is cut from the head of `main`. Its version is the stable the changes since the last
 * stable lead to, with the next beta number of that stable.
 */
function planBeta({ app, releases, forced, head, changesBetween }) {
    const stable = newest(releases, (release) => !release.prerelease);
    const core = targetOf({ app, stable, forced, bump: bumpOf(changesBetween(stable?.sha, head)) });
    const version = nextBeta(core, releases);
    const tag = `${app.name}-v${version}`;
    const latest = newest(releases, () => true);

    if (latest !== undefined && compareVersions(version, latest.version) <= 0) {
        throw new Error(`${tag} would come before ${latest.tag}, which is out already.`);
    }

    const previous = previousTag(
        tag,
        releases.map((release) => release.tag),
    );
    const changes = changesBetween(shaOf(releases, previous), head);

    if (changes.length === 0 && forced === '') {
        throw new Error(`Nothing new for ${app.name} since ${previous ?? 'its start'}.`);
    }

    return { tag, version, prerelease: true, sha: head, previous, changes };
}

/**
 * GitHub refuses the token of a run a release on a commit whose workflow files no branch holds as
 * they are, since that token can never edit workflows. `main` is the only branch: a beta whose
 * workflows `main` changed since cannot be promoted, and a new beta carries them.
 */
function refuseMovedWorkflows({ app, beta, head, workflowsBetween }) {
    const moved = workflowsBetween(beta.sha, head);

    if (moved.length > 0) {
        throw new Error(
            `${beta.tag} runs workflows main changed since (${moved.join(', ')}): GitHub publishes no release on it. Cut a new beta of ${app.name} first.`,
        );
    }
}

/**
 * A stable is never cut from `main`: it is the last beta, built again from the same commit
 * with the version that beta was aiming at, so what reaches everyone is what the beta ran.
 */
function planStable({ app, releases, forced, head, changesBetween, workflowsBetween }) {
    if (forced !== '') {
        throw new Error('A stable takes the version of the beta it promotes: force it on a beta.');
    }

    const stable = newest(releases, (release) => !release.prerelease);
    const after = (release) =>
        stable === undefined || compareVersions(release.version, stable.version) > 0;
    const beta = newest(releases, (release) => release.prerelease && after(release));

    if (beta === undefined) {
        throw new Error(`No beta of ${app.name} after ${stable?.tag ?? 'its start'} to promote.`);
    }

    refuseMovedWorkflows({ app, beta, head, workflowsBetween });

    const version = beta.version.split('-beta.')[0] ?? '';
    const tag = `${app.name}-v${version}`;
    const previous = previousTag(
        tag,
        releases.map((release) => release.tag),
    );
    const changes = changesBetween(shaOf(releases, previous), beta.sha);

    return { tag, version, prerelease: false, sha: beta.sha, previous, changes };
}

const PLANS = { beta: planBeta, stable: planStable };

/**
 * What a release of an app on a channel will be: its tag, the commit it builds and the changes
 * its notes list. `releases` are the ones the app has, each with the commit of its tag;
 * `changesBetween(from, to)` lists the changes of the app in that range, from the start when
 * `from` is none; `workflowsBetween(from, to)`, the workflow files that differ between the two.
 */
export function planRelease({ channel, ...input }) {
    if (!Object.hasOwn(PLANS, channel)) {
        throw new Error(`"${channel}" is no channel: it is beta or stable.`);
    }

    return PLANS[channel](input);
}

function git(args) {
    const done = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

    if (done.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed: ${done.stderr}`);
    }

    return done.stdout.split('\n').filter(Boolean);
}

/** The releases of an app, each with the commit its tag points at, peeled when annotated. */
function releasesOf(app) {
    const format = '%(refname:short)%09%(objectname)%09%(*objectname)';

    return git(['for-each-ref', `--format=${format}`, 'refs/tags'])
        .map((line) => line.split('\t'))
        .map(([tag = '', object = '', peeled = '']) => ({ tag, sha: peeled || object }))
        .map((ref) => ({ ...ref, release: releaseOf(ref.tag) }))
        .filter(({ release }) => release?.app === app.app)
        .map(({ tag, sha, release }) => ({ tag, sha, ...release }));
}

/** The changes of an app between two commits, as git lists the titles of the paths it ships. */
function gitChanges(paths) {
    return function changesBetween(from, to) {
        const range = from === undefined ? to : `${from}..${to}`;

        return changesOf(git(['log', '--format=%s', range, '--', ...paths]));
    };
}

function gitWorkflowsBetween(from, to) {
    return git(['diff', '--name-only', from, to, '--', '.github/workflows']);
}

/** The lines the workflow appends to `$GITHUB_OUTPUT`, one `key=value` each. */
export function planOutputs(plan, app) {
    const { tag, version, prerelease, sha, previous = '' } = plan;
    const { app: folder, product, feed } = app;
    const values = { tag, version, prerelease, sha, previous, app: folder, product, feed };

    return Object.entries(values)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('\n');
}

function main([name = '', channel = '', forced = '', notesFile = 'release-notes.md']) {
    const app = appNamed(name);
    const [head = ''] = git(['rev-parse', 'HEAD']);
    const changesBetween = gitChanges(appPaths('.', app.app));
    const releases = releasesOf(app);
    const plan = planRelease({
        channel,
        app,
        releases,
        forced,
        head,
        changesBetween,
        workflowsBetween: gitWorkflowsBetween,
    });
    const repository = process.env['GITHUB_REPOSITORY'] ?? 'joalvm/mandor';
    const server = process.env['GITHUB_SERVER_URL'] ?? 'https://github.com';
    const compare =
        plan.previous === undefined
            ? undefined
            : `${server}/${repository}/compare/${plan.previous}...${plan.tag}`;

    writeFileSync(notesFile, releaseNotes({ changes: plan.changes, repository, compare }), 'utf8');
    process.stdout.write(`${planOutputs(plan, app)}\n`);
}

// A refusal is a line the run shows on its summary, not a stack of the script that wrote it.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        process.stderr.write(
            `::error::${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exitCode = 1;
    }
}
