/**
 * The gate that reads the open milestone. It answers two questions a reviewer used to answer by
 * hand and usually forgot: does the tick beside a phase correspond to anything in the tree, and
 * does the milestone table say what the ticks say. A folder left by a closed milestone is a
 * third problem: the table says the milestone is over and the tree says otherwise. A plan that has not been started yet is left
 * alone — a check written before the phase is designed is a fabrication, and fabrications pass.
 */

import { planProblems } from './plan-problems.mjs';
import { leftoverMilestones, openMilestone, planFiles, statedStates } from './plan-state.mjs';

const folder = openMilestone('.');
const stated = folder === undefined ? {} : statedStates(folder);
const leftovers = leftoverMilestones('.').map(
    (name) => `docs/plans/${name} belongs to a closed milestone: its folder should be gone`,
);
const problems = [
    ...leftovers,
    ...(folder === undefined
        ? []
        : planFiles(folder).flatMap((file) => planProblems(folder, file, stated[file]))),
];

if (problems.length === 0) {
    console.log('plans: every ticked phase still holds.');
} else {
    console.error(`plans: ${String(problems.length)} claim(s) a plan makes are not true.\n`);

    for (const problem of problems) {
        console.error(`  - ${problem}`);
    }

    process.exitCode = 1;
}
