/**
 * The parts of the design system a machine can decide, checked on every `verify`. What is left
 * to judgement stays in the specs and in the skill; what is mechanical stops being a review note
 * and becomes a failure with the correction written next to it.
 */

import { bandGeometryProblems } from './band-geometry.mjs';
import { focusRingProblems } from './focus-ring.mjs';
import { inlineValueProblems } from './inline-values.mjs';
import { markupProblems } from './markup.mjs';
import { repeatedTokenProblems } from './repeated-token.mjs';
import { sourceFiles } from './source-files.mjs';
import { writingSideProblems } from './writing-sides.mjs';

const files = await sourceFiles();
const problems = [
    ...bandGeometryProblems(files),
    ...focusRingProblems(files),
    ...inlineValueProblems(files),
    ...markupProblems(files),
    ...repeatedTokenProblems(files),
    ...writingSideProblems(files),
];

if (problems.length === 0) {
    console.log('design: every mechanical rule of the system holds.');
} else {
    console.error(`design: ${String(problems.length)} rule(s) of the system broken.\n`);

    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }

    process.exitCode = 1;
}
