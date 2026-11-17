/**
 * A plan is read by a machine because a plan read only by whoever wrote it is a wish. Each phase
 * carries its own check block, and the block is what turns «done» from a claim into a fact: the
 * tick beside the phase and the state of the tree stop being two separate stories.
 */

const PHASE = /^### \[( |x)\] (Fase \d+[^\n]*)$/gm;
const CHECK_BLOCK = /```check\n([\s\S]*?)```/;

/** The lines of a check block, without the blanks and the notes a human left in it. */
function checkLines(body) {
    const block = CHECK_BLOCK.exec(body);

    if (block === null) {
        return undefined;
    }

    return block[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#'));
}

/**
 * Every phase of a plan, in the order it is meant to be taken: its title, whether it is ticked,
 * and the checks it declares. A phase with no block at all is told apart from one with an empty
 * block, because the first is an oversight and the second is a phase that claims nothing.
 */
export function phasesOf(plan) {
    const marks = [...plan.matchAll(PHASE)];

    return marks.map((mark, index) => {
        const start = mark.index + mark[0].length;
        const end = index + 1 < marks.length ? marks[index + 1].index : plan.length;

        return {
            checks: checkLines(plan.slice(start, end)),
            done: mark[1] === 'x',
            title: mark[2],
        };
    });
}
