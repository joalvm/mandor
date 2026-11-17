/**
 * The promises the product makes outside the interface, checked by a machine. Each one was
 * written in prose first, in the project rules or in a plan, and each one was broken anyway: prose
 * is read once and a gate is read on every push.
 */

import { sourceFiles } from '../design/source-files.mjs';
import { interfaceLanguageProblems } from './interface-language.mjs';
import { productionOnlyProblems } from './production-only.mjs';
import { storeScopeProblems } from './store-scope.mjs';
import { testFiles } from './test-files.mjs';
import { testRuleProblems } from './test-rules.mjs';

const files = await sourceFiles();
const problems = [
    ...productionOnlyProblems(files),
    ...interfaceLanguageProblems(files),
    ...storeScopeProblems(files),
    ...testRuleProblems(testFiles(process.cwd())),
];

if (problems.length === 0) {
    console.log('guards: every promise the runtime and the tests make holds.');
} else {
    console.error(`guards: ${String(problems.length)} promise(s) broken.\n`);

    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }

    process.exitCode = 1;
}
