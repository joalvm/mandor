import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { targetedE2eCommand } from './e2e-command.mjs';
import { prepareGitSnapshot } from './prepare-git-snapshot.mjs';

const COMMANDS = {
    ci: [],
    verify: [],
    e2e: [],
    installers: [],
    qa: [],
    test: ['npx', 'vitest', 'run'],
    check: ['node', 'tools/check.mjs'],
};
const mode = process.argv[2] ?? 'ci';
const args = process.argv.slice(3);
const base = process.env.QA_BASE ?? 'origin/main';
const output = resolve('.local-ci');

if (!Object.hasOwn(COMMANDS, mode)) {
    throw new Error(`Unknown CI mode: ${mode}`);
}

if (mode === 'check' && args.length === 0) {
    throw new Error('ci:check requires explicit source or test paths.');
}

mkdirSync(output, { recursive: true });

/** Every run carries it, so a run can see another one still going, or one left behind. */
const LABEL = 'mandor.ci.run';
const running = execFileSync('docker', ['ps', '-q', '--filter', `label=${LABEL}`], {
    encoding: 'utf8',
}).trim();

// Two runs at once outgrow the Docker VM; so does a run whose client lost the engine while its
// container kept going. Either way the answer is to wait or remove it, never to stack one more.
if (running !== '') {
    throw new Error(
        `A local CI run is still going (${running.split(/\s+/u).join(', ')}): wait for it, or remove it with docker rm -f.`,
    );
}

const directory = mkdtempSync(join(output, 'input-'));
const run = basename(directory).toLowerCase();
const image = `mandor-ci-local:${run}`;
const container = `mandor-ci-${run}`;
const env = { ...process.env, MANDOR_CI_INPUT: directory, MANDOR_CI_IMAGE: image };

prepareGitSnapshot({ cwd: process.cwd(), base, directory });

function docker(args) {
    execFileSync('docker', args, { env, stdio: 'inherit' });
}

try {
    docker(['compose', '-f', 'compose.ci.yaml', 'build', 'ci']);
    // The specs of an e2e given by name replace the command of its service; the rest append to it.
    const command =
        mode === 'e2e' && args.length > 0 ? targetedE2eCommand(args) : [...COMMANDS[mode], ...args];

    docker([
        'compose',
        '-f',
        'compose.ci.yaml',
        'run',
        '--rm',
        '--name',
        container,
        '--label',
        `${LABEL}=${run}`,
        mode,
        ...command,
    ]);
} catch (error) {
    process.exitCode = error.status ?? 1;
} finally {
    try {
        // When the client loses the engine, `--rm` never fires and the container keeps running.
        execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
    } catch {
        // Already gone: `--rm` removed it.
    }

    try {
        // This invocation owns this unique image tag; other checkouts use their own tag.
        docker(['image', 'rm', image]);
    } catch {
        console.warn(`Local CI image retained: ${image}`);
    }

    // The bundle of the history only feeds this run, and the report already copied its
    // metadata: kept, one per run, they pile up by the gigabyte.
    rmSync(directory, { recursive: true, force: true });
}
