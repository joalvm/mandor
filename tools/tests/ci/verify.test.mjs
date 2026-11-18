import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runVerification, verificationSteps } from '../../verify.mjs';

const run = promisify(execFile);
const VERIFY = fileURLToPath(new URL('../../verify.mjs', import.meta.url));

let root = '';

function step(name, code) {
    return { name, args: ['--input-type=module', '-e', code] };
}

function record(name) {
    return step(
        name,
        `import { appendFileSync } from 'node:fs'; appendFileSync('order', '${name}\\n');`,
    );
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-verify-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('verification blocks with visible progress', () => {
    it('finishes each real child before starting the next and reports its duration', async () => {
        const lines = [];
        const status = await runVerification([record('first'), record('second')], {
            cwd: root,
            log: (line) => lines.push(line),
        });

        expect(status).toBe(0);
        expect(existsSync(join(root, 'order'))).toBe(true);
        expect(readFileSync(join(root, 'order'), 'utf8')).toBe('first\nsecond\n');
        expect(lines).toEqual([
            '[verify] start first',
            expect.stringMatching(/^\[verify\] done first \(\d+\.\d+s\)$/u),
            '[verify] start second',
            expect.stringMatching(/^\[verify\] done second \(\d+\.\d+s\)$/u),
        ]);
    });

    it('returns the failing child exit code and leaves later blocks unstarted', async () => {
        const lines = [];
        const status = await runVerification(
            [record('first'), step('broken', 'process.exit(7);'), record('unreached')],
            { cwd: root, log: (line) => lines.push(line) },
        );

        expect(status).toBe(7);
        expect(readFileSync(join(root, 'order'), 'utf8')).toBe('first\n');
        expect(lines).toContainEqual(
            expect.stringMatching(/^\[verify\] failed broken \(exit 7; \d+\.\d+s\)$/u),
        );
        expect(lines).not.toContain('[verify] start unreached');
    });

    /** The child waits for the progress message itself, so the test never guesses how long it takes. */
    it('names a still-running quiet block until it finishes', async () => {
        const lines = [];
        const quiet = step(
            'quiet',
            `import { existsSync, watch } from 'node:fs';
             const watcher = watch('.', () => {
                 if (existsSync('release')) { watcher.close(); }
             });
             if (existsSync('release')) { watcher.close(); }`,
        );
        const status = await runVerification([quiet], {
            cwd: root,
            heartbeatMs: 10,
            log: (line) => {
                lines.push(line);

                if (line.startsWith('[verify] running quiet')) {
                    writeFileSync(join(root, 'release'), 'released');
                }
            },
        });

        expect(status).toBe(0);
        expect(lines).toContainEqual(
            expect.stringMatching(/^\[verify\] running quiet \(\d+\.\d+s\)$/u),
        );
        expect(lines.at(-1)).toMatch(/^\[verify\] done quiet \(\d+\.\d+s\)$/u);
    });

    it('reports a child that could not start as a failed block', async () => {
        const lines = [];
        const status = await runVerification([record('missing-directory')], {
            cwd: join(root, 'absent'),
            log: (line) => lines.push(line),
        });

        expect(status).toBe(1);
        expect(lines.join('\n')).toContain('[verify] failed missing-directory');
        expect(lines.join('\n')).toContain('ENOENT');
    });
});

describe('the two complete halves of verification', () => {
    /** A CLI path with spaces stays one argument, without invoking the Windows shell shim. */
    it.each(['direct', 'linked'])(
        'runs the %s CLI through the npm executable supplied by its caller',
        async (mode) => {
            const npm = join(root, 'npm cli.mjs');
            const linked = join(root, 'linked tools');
            const entry = mode === 'linked' ? join(linked, 'verify.mjs') : VERIFY;
            // Windows resolves environment keys without case; an inherited uppercase key wins.
            const inherited = Object.fromEntries(
                Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_execpath'),
            );

            if (mode === 'linked') {
                await symlink(dirname(VERIFY), linked, 'junction');
            }

            writeFileSync(
                npm,
                `import { appendFileSync } from 'node:fs';
             appendFileSync('commands', process.argv.slice(2).join(':') + '\\n');`,
            );

            const { stdout } = await run(process.execPath, [entry, 'tests-build'], {
                cwd: root,
                env: { ...inherited, npm_execpath: npm },
            });

            expect(existsSync(join(root, 'commands'))).toBe(true);
            expect(readFileSync(join(root, 'commands'), 'utf8')).toBe('run:test\nrun:build\n');
            expect(stdout).toContain('[verify] start test');
            expect(stdout).toMatch(/\[verify\] done build \(\d+\.\d+s\)/u);
        },
    );

    it('partitions the whole ordered gate at the typecheck boundary', () => {
        const npm = join(root, 'npm cli.mjs');
        const checks = verificationSteps('checks', npm);
        const testsBuild = verificationSteps('tests-build', npm);

        expect([...checks, ...testsBuild]).toEqual(verificationSteps('all', npm));
        expect(verificationSteps('all', npm).map((each) => each.name)).toEqual([
            'format:check',
            'tokens',
            'icons',
            'i18n',
            'design',
            'guards',
            'plans',
            'lint',
            'depcruise',
            'unused',
            'duplicates',
            'typecheck',
            'test',
            'build',
        ]);
        expect(checks[0]?.name).toBe('format:check');
        expect(checks.at(-1)?.name).toBe('typecheck');
        expect(testsBuild.map((each) => each.name)).toEqual(['test', 'build']);
        expect(checks.every((each) => each.args[0] === npm)).toBe(true);
        expect(checks.find((each) => each.name === 'tokens')?.args).toEqual([
            npm,
            'run',
            'tokens',
            '--',
            '--check',
        ]);
    });

    it('rejects an unknown scope before returning any runnable block', () => {
        expect(() => verificationSteps('unknown', 'npm-cli.js')).toThrow(
            'Unknown verify scope: unknown',
        );
    });
});
