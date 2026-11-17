/**
 * The contribution rules a reviewer used to hold in memory, checked by a machine. It reads the
 * range against the base branch and answers with the rule that broke and how to put it right.
 *
 * The pull request title arrives through the environment and never through the command line:
 * a title is written by whoever opens the request, and a shell must not read it.
 */

import { execFileSync } from 'node:child_process';

import { branchNameProblems } from './branch-name.mjs';
import { trailerProblems } from './commit-trailers.mjs';
import { titleProblems } from './conventional-title.mjs';
import { forbiddenContentProblems } from './forbidden-content.mjs';
import { newFileTestProblems } from './new-file-tests.mjs';

const base = process.env.QA_BASE ?? 'origin/main';

function git(args) {
    // A milestone's range can be megabytes of diff, and the default buffer is one: the check
    // dies on the size of what it is asked to read, not on any rule it found broken.
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
}

function lines(output) {
    return output === '' ? [] : output.split('\n');
}

function addedLines(diff) {
    const added = [];
    let path = '';

    for (const line of diff.split('\n')) {
        const isHeader = line.startsWith('+++ ');

        if (isHeader) {
            path = line.slice('+++ b/'.length);
        }

        if (!isHeader && line.startsWith('+')) {
            added.push([path, line.slice(1)]);
        }
    }

    return added;
}

function report(problems) {
    if (problems.length === 0) {
        console.log('qa: every contribution rule holds.');

        return;
    }

    console.error(`qa: ${String(problems.length)} contribution rule(s) broken.\n`);

    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }

    process.exitCode = 1;
}

const branch = process.env.QA_BRANCH ?? git(['rev-parse', '--abbrev-ref', 'HEAD']);
const title = process.env.QA_TITLE ?? git(['log', '-1', '--format=%s']);
const changedPaths = lines(git(['diff', '--name-only', `${base}...HEAD`]));
// Past a thousand files git stops pairing renames and reports every moved file as added: `-l0`
// lifts that limit, so a file that only changed folders is not taken for a new one.
const addedPaths = lines(
    git(['diff', '--find-renames', '-l0', '--diff-filter=A', '--name-only', `${base}...HEAD`]),
);
const messages = lines(git(['log', '--format=%B%x00', `${base}..HEAD`]))
    .join('\n')
    .split('\0');

report([
    ...branchNameProblems(branch),
    ...titleProblems(title),
    ...newFileTestProblems(addedPaths),
    ...trailerProblems(messages.filter((message) => message.trim() !== '')),
    ...forbiddenContentProblems(
        changedPaths,
        addedLines(git(['diff', '--unified=0', `${base}...HEAD`])),
    ),
]);
