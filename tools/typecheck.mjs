#!/usr/bin/env node
/**
 * The types of the whole monorepo: the root config, the lab and the `tsconfig.json` of every
 * package and app, each checked on its own, as many at once as the machine has cores.
 *
 * The check runs on the native compiler (TypeScript 7, installed as `typescript-native`): the
 * same language, a fraction of the time, and the time is what a runner bills. The linter still
 * reads the code through TypeScript 6, the one `typescript` names, because its type-aware rules
 * need the compiler API that the native one does not offer yet.
 *
 * Usage: `npm run typecheck`.
 */

import { execFile } from 'node:child_process';
import { globSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);

const TSC = 'node_modules/typescript-native/bin/tsc';

const projects = [
    'tsconfig.json',
    'tools/ui-lab/tsconfig.json',
    ...globSync(['packages/*/tsconfig.json', 'apps/*/tsconfig.json'])
        .map((file) => file.replaceAll('\\', '/'))
        .sort(),
];

/** @returns {Promise<string | null>} what the compiler said about a failing project, or null */
async function check(project) {
    try {
        await run(process.execPath, [TSC, '--noEmit', '--pretty', 'false', '-p', project], {
            maxBuffer: 64 * 1024 * 1024,
        });

        return null;
    } catch (error) {
        return `${project}\n${String(error.stdout ?? '')}${String(error.stderr ?? '')}`;
    }
}

async function checkAll() {
    const waiting = [...projects];
    const failures = [];

    async function worker() {
        for (let project = waiting.shift(); project !== undefined; project = waiting.shift()) {
            const failure = await check(project);

            if (failure !== null) {
                failures.push(failure);
            }
        }
    }

    await Promise.all(Array.from({ length: availableParallelism() }, worker));

    return failures;
}

const failures = await checkAll();

if (failures.length > 0) {
    console.error(failures.join('\n'));
    console.error(`typecheck: ${String(failures.length)} of ${String(projects.length)} failed.`);
    process.exit(1);
}

console.log(`typecheck: ${String(projects.length)} projects clean.`);
