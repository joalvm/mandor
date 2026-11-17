import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Where the installed app of the pair looks for a version: the local feed the e2e serves. */
export const FEED_URL = 'http://127.0.0.1:47613/';

const TARGETS = {
    win32: ['--win', 'nsis', '--x64'],
    linux: ['--linux', 'AppImage', '--x64'],
};

/** A table on purpose: it proves the sanitizer lets GitHub-flavoured Markdown through. */
const NOTES =
    '## What changed\n\n| Area | Change |\n| ---- | ------ |\n| Updates | Check from Help |';

/** The beta the installed app starts from and the stable it must arrive at. */
export function versionsOf(version) {
    if (version.includes('-')) {
        throw new Error(`"${version}" is a prerelease: there is no beta to start from before it.`);
    }

    return { from: `${version}-beta.1`, to: version };
}

/** What electron-builder is told to build, for the system the pair is made on. */
export function platformTarget(platform) {
    const target = TARGETS[platform];

    if (!target) {
        throw new Error(
            `"${platform}" is not covered: the update pair is built on Windows and Linux.`,
        );
    }

    return target;
}

/**
 * The arguments for one build of the pair. The feed goes in by `-c`, never in the builder files:
 * touching one starts the installers workflow, and the real feed is written with the signing.
 */
export function builderArgs({ platform, version, output, allChannels = false, notes }) {
    return [
        ...platformTarget(platform),
        '--publish',
        'never',
        `-c.extraMetadata.version=${version}`,
        `-c.directories.output=${output}`,
        '-c.publish.provider=generic',
        `-c.publish.url=${FEED_URL}`,
        ...(allChannels ? ['-c.generateUpdatesFilesForAllChannels=true'] : []),
        ...(notes === undefined ? [] : [`-c.releaseInfo.releaseNotes=${notes}`]),
    ];
}

/**
 * electron-builder run as its own script by this node, with no shell between: a Windows shell
 * splits an argument at its spaces, and the notes are one argument with spaces and lines.
 */
export function builderInvocation(root, args) {
    return {
        command: process.execPath,
        args: [join(root, 'node_modules', 'electron-builder', 'cli.js'), ...args],
        shell: false,
    };
}

function run({ command, args, shell }, cwd) {
    const done = spawnSync(command, args, { cwd, stdio: 'inherit', shell });

    if (done.status !== 0) {
        throw new Error(`${command} ${args[0] ?? ''} failed with ${String(done.status)}.`);
    }
}

/** Builds the app once, then its installer twice: the beta to install and the stable to receive. */
function main(app) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const appDir = join(root, 'apps', app);
    const { version } = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
    const { from, to } = versionsOf(version);
    const config = ['--config', 'electron-builder.yml'];

    // npm is a script of its own on Windows, which only a shell can start.
    run(
        {
            command: 'npm',
            args: ['run', 'build', '-w', `apps/${app}`],
            shell: process.platform === 'win32',
        },
        root,
    );
    run(
        builderInvocation(root, [
            ...config,
            ...builderArgs({
                platform: process.platform,
                version: from,
                output: 'dist/update-pair/from',
            }),
        ]),
        appDir,
    );
    run(
        builderInvocation(root, [
            ...config,
            ...builderArgs({
                platform: process.platform,
                version: to,
                output: 'dist/update-pair/feed',
                allChannels: true,
                notes: NOTES,
            }),
        ]),
        appDir,
    );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const app = process.argv[2];

    if (app !== 'async' && app !== 'sync') {
        throw new Error('Usage: node tools/update/build-update-pair.mjs <async|sync>');
    }

    main(app);
}
