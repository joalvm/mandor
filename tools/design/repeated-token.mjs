/**
 * A token declared twice in the same block is not a duplicate line: it is a value that lost to
 * another value in silence, and the loser stays in the file looking like it still decides
 * something. The second one wins, nobody reads that far, and the token becomes untrustworthy.
 */

const DECLARATION = /^\s*(--[a-z0-9-]+)\s*:/;

/** Every custom property of a stylesheet, tagged with the block that declares it. */
function declarationsOf(text) {
    const rows = [];
    const stack = [];
    let opened = 0;

    for (const line of text.split('\n')) {
        const declared = DECLARATION.exec(line);

        if (declared !== null) {
            rows.push({ block: stack.at(-1) ?? 0, name: declared[1] });
        }

        if (line.includes('{')) {
            opened += 1;
            stack.push(opened);
        }

        if (line.includes('}')) {
            stack.pop();
        }
    }

    return rows;
}

function repeatedIn(file) {
    const seen = new Set();
    const problems = [];

    for (const row of declarationsOf(file.text)) {
        const key = `${String(row.block)} ${row.name}`;

        if (seen.has(key)) {
            problems.push(
                `${file.path}: ${row.name} is declared twice in the same block. ` +
                    `Leave one declaration: the second already wins, silently.`,
            );
        }

        seen.add(key);
    }

    return problems;
}

/** Tokens declared more than once inside a single block. */
export function repeatedTokenProblems(files) {
    return files.filter((file) => file.path.endsWith('.css')).flatMap(repeatedIn);
}
