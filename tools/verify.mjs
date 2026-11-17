import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const CHECKS = [
    ['format:check'],
    ['tokens', '--', '--check'],
    ['icons', '--', '--check'],
    ['i18n', '--', '--check'],
    ['design'],
    ['guards'],
    ['plans'],
    ['lint'],
    ['depcruise'],
    ['unused'],
    ['duplicates'],
    ['typecheck'],
];
const TESTS_BUILD = [['test'], ['build']];
const SCOPES = { all: [...CHECKS, ...TESTS_BUILD], checks: CHECKS, 'tests-build': TESTS_BUILD };

/** @typedef {{ name: string; args: string[] }} Step */
/** @typedef {{ cwd?: string; log?: (line: string) => unknown; heartbeatMs?: number }} Options */

function elapsed(started) {
    return `${((performance.now() - started) / 1_000).toFixed(1)}s`;
}

function childExit(args, cwd) {
    return new Promise((resolveExit, reject) => {
        const child = spawn(process.execPath, args, { cwd, stdio: 'inherit' });

        child.once('error', reject);
        child.once('close', (code) => resolveExit(code ?? 1));
    });
}

async function runBlock(step, { cwd, log, heartbeatMs }) {
    const started = performance.now();

    log(`[verify] start ${step.name}`);

    const heartbeat = setInterval(() => {
        log(`[verify] running ${step.name} (${elapsed(started)})`);
    }, heartbeatMs);

    try {
        const code = await childExit(step.args, cwd);
        const status = code === 0 ? 'done' : 'failed';
        const result = code === 0 ? elapsed(started) : `exit ${String(code)}; ${elapsed(started)}`;

        log(`[verify] ${status} ${step.name} (${result})`);

        return code;
    } catch (error) {
        log(`[verify] failed ${step.name} (${elapsed(started)}): ${String(error)}`);

        return 1;
    } finally {
        clearInterval(heartbeat);
    }
}

/**
 * Runs real Node children in order, keeping the active block visible until it exits.
 * @param {readonly Step[]} steps
 * @param {Options} options
 * @returns {Promise<number>} the first failing exit code, or zero when every block passes
 */
export async function runVerification(steps, options = {}) {
    const settings = { log: console.log, heartbeatMs: 15_000, ...options };

    for (const step of steps) {
        const code = await runBlock(step, settings);

        if (code !== 0) {
            return code;
        }
    }

    return 0;
}

/**
 * Selects complete ordered scopes; npm runs through Node so Windows needs no shell shim.
 * @param {string} scope
 * @param {string} npm the npm CLI provided by npm_execpath
 * @returns {Step[]}
 */
export function verificationSteps(scope, npm) {
    if (!Object.hasOwn(SCOPES, scope)) {
        throw new Error(`Unknown verify scope: ${scope}`);
    }

    return SCOPES[scope].map(([name, ...args]) => ({ name, args: [npm, 'run', name, ...args] }));
}

async function main() {
    const npm = process.env.npm_execpath;

    if (npm === undefined) {
        throw new Error(
            'Run verification with npm run verify, verify:checks or verify:tests-build.',
        );
    }

    process.exitCode = await runVerification(verificationSteps(process.argv[2] ?? 'all', npm));
}

// Node resolves module URLs through links, while argv keeps the entry path the caller used.
if (
    process.argv[1] !== undefined &&
    realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
    try {
        await main();
    } catch (error) {
        console.error(String(error));
        process.exitCode = 1;
    }
}
