#!/usr/bin/env node
/**
 * The lint of the whole tree, one workspace at a time.
 *
 * The rules read types, so ESLint builds the TypeScript program of every file it lints and keeps
 * it until it exits. One `eslint .` over the monorepo holds all of them at once and outgrew the
 * heap a hosted runner gives Node. A process per workspace holds only its own program and the
 * sources it imports, and hands the memory back when it ends, so the peak follows the largest
 * workspace instead of the size of the tree.
 *
 * Every workspace is linted even after one fails, so a run reports every problem it finds; the
 * exit code says whether any did. Arguments after `--` reach every run (`npm run lint -- --fix`).
 */

import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { dirname } from 'node:path';

const ESLINT = 'node_modules/eslint/bin/eslint.js';

const workspaces = globSync(['packages/*/package.json', 'apps/*/package.json'])
    .map((manifest) => dirname(manifest).replaceAll('\\', '/'))
    .sort();

/** What no workspace owns: the tools and the files at the root. */
const rest = ['.', '--ignore-pattern', 'packages/**', '--ignore-pattern', 'apps/**'];
const targets = [...workspaces.map((workspace) => [workspace]), rest];
const extra = process.argv.slice(2);
const failed = [];

for (const target of targets) {
    const result = spawnSync(
        process.execPath,
        [ESLINT, '--no-error-on-unmatched-pattern', ...extra, ...target],
        { stdio: 'inherit' },
    );

    if (result.status !== 0) {
        failed.push(target[0] === '.' ? 'the root and tools' : target[0]);
    }
}

if (failed.length > 0) {
    console.error(`lint: problems in ${failed.join(', ')}.`);
    process.exit(1);
}

console.log(`lint: ${String(targets.length)} runs, no problem.`);
