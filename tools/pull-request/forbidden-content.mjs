const LOCAL_STATE = /^\.mandor\//;
// A Windows path reaches the diff twice over: raw in prose and configuration, doubled in source
// where the language escapes it. Both spellings are the same broken path.
const MACHINE_PATH = /([A-Za-z]:[\\/]+Users[\\/]+|\/Users\/|\/home\/)/;
const SHIPPED = /^(packages|apps|tools)\//;
// Where the rule stops reading. A test that names a path is either asserting this rule, and needs
// the string, or hardcoding a real one, and dies on the first machine that is not its author's.
const TEST = /(^|\/)tests\//;

/**
 * Two things that must never travel in a commit: the local state folder, which holds the
 * references to the secrets of whoever ran the app, and the absolute path of one machine, which
 * is broken on every other one. Prose may quote a path; code may not contain one.
 */
export function forbiddenContentProblems(changedPaths, addedLines) {
    return [...localStateProblems(changedPaths), ...machinePathProblems(addedLines)];
}

function localStateProblems(changedPaths) {
    return changedPaths
        .filter((path) => LOCAL_STATE.test(path))
        .map((path) => `"${path}" is local state. .mandor/ is ignored from the first commit.`);
}

function machinePathProblems(addedLines) {
    return addedLines
        .filter(([path, line]) => SHIPPED.test(path) && !TEST.test(path) && MACHINE_PATH.test(line))
        .map(([path]) => `"${path}" adds an absolute path of one machine.`);
}
