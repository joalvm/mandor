/**
 * The table of a milestone and the ticks inside its plans are two spellings of the same fact,
 * and they drifted apart the first time somebody shipped a plan and left the row saying
 * «pendiente». Here they are compared, so the drift costs a red gate instead of a lost plan.
 */

import { readdirSync } from 'node:fs';

import { present, textOf } from './tree-files.mjs';

const MILESTONE = /^\| \*{0,2}\[?(H(\d+)).*?\|\s*\*{0,2}([^*|]+?)\*{0,2}\s*\|$/gm;
const PLAN_ROW = /^\| \[\d+\]\((\d+-[a-z0-9-]+\.md)\).*\|\s*([a-zé ]+?)\s*\|$/gm;

/** The folder of the one open milestone, or nothing when no milestone is open. */
export function openMilestone(root) {
    const rows = [...textOf(`${root}/docs/plans/README.md`).matchAll(MILESTONE)];
    const open = rows.find(([, , , state]) => state === 'abierto');

    return open === undefined ? undefined : `${root}/docs/plans/hito-${open[2]}`;
}

/**
 * The milestone folders that should not be there: every `hito-N` but the open one. A closed
 * milestone leaves no folder behind. The plans live outside the repo: a checkout without them
 * has nothing left over.
 */
export function leftoverMilestones(root) {
    const open = openMilestone(root);

    if (!present(`${root}/docs/plans`)) {
        return [];
    }

    return readdirSync(`${root}/docs/plans`, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^hito-\d+$/.test(entry.name))
        .map((entry) => entry.name)
        .filter((name) => open !== `${root}/docs/plans/${name}`)
        .sort();
}

/** Every plan of a milestone folder, in reading order. */
export function planFiles(folder) {
    return readdirSync(folder)
        .filter((name) => /^\d+-.*\.md$/.test(name))
        .sort();
}

/** What the milestone table claims about each plan, by file name. */
export function statedStates(folder) {
    const rows = [...textOf(`${folder}/README.md`).matchAll(PLAN_ROW)];

    return Object.fromEntries(rows.map(([, file, state]) => [file, state]));
}

/** What the ticks inside a plan say its state is, which is the only one that counts. */
export function realState(phases) {
    const done = phases.filter((phase) => phase.done).length;

    if (done === 0) {
        return 'pendiente';
    }

    return done === phases.length ? 'hecho' : 'en curso';
}
