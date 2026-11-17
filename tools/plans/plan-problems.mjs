/**
 * What one plan claims, set against the tree and against the row the milestone table gives it.
 */

import { phasesOf } from './plan-phases.mjs';
import { realState } from './plan-state.mjs';
import { checkProblem } from './run-checks.mjs';
import { textOf } from './tree-files.mjs';

/**
 * A plan a later decision replaced. Its ticks still say what it delivered, and the tree holds
 * what replaced it on purpose, so its checks are not read any more: the decision is where a
 * reader goes next. Only a finished plan is replaced; one left halfway was abandoned, and that
 * is a different sentence for the table to say.
 */
const REPLACED = 'sustituido';

function phaseProblems(plan, phase, started) {
    if (phase.checks === undefined) {
        return started ? [`${plan} · ${phase.title}: has no \`check\` block`] : [];
    }

    if (!phase.done) {
        return [];
    }

    return phase.checks
        .map((line) => checkProblem(line))
        .filter((problem) => problem !== undefined)
        .map((problem) => `${plan} · ${phase.title}: ${problem}`);
}

function replacedProblems(file, real) {
    if (real === 'hecho') {
        return [];
    }

    return [
        `${file}: the table says \`${REPLACED}\` and the ticks say \`${real}\`: only a finished plan is replaced`,
    ];
}

/** Every claim of a plan that is not true, given what the milestone table says about it. */
export function planProblems(folder, file, stated) {
    const phases = phasesOf(textOf(`${folder}/${file}`));
    const real = realState(phases);

    if (stated === REPLACED) {
        return replacedProblems(file, real);
    }

    const started = stated !== 'pendiente' || real !== 'pendiente';
    const problems = phases.flatMap((phase) => phaseProblems(file, phase, started));

    if (stated !== undefined && stated !== real) {
        problems.push(`${file}: the table says \`${stated}\` and the ticks say \`${real}\``);
    }

    return problems;
}
