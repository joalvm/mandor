/**
 * Every store says what it lives for. One that feeds on an origin goes back to its initial state
 * when the origin is left (`scopeToOrigin`); one that lives as long as the window says so, with
 * the reason. A store that decided nothing is a store that only grows, and the spec of origins
 * promises memory comes back where it was.
 */

const CREATES = /\bcreateStore\b(?:<[^()]*>)?\s*(?:\(\s*\))?\s*\(/g;
const SCOPED = /\bscopeToOrigin\(/g;
const WINDOW = /^\s*\/\/ store-scope: window [—-] \S/gm;
const IN_SOURCE = /^(?:packages|apps)\/[^/]+\/src\/(?!.*\btesting\/).+\.tsx?$/;

/** @param {string} text @param {RegExp} pattern */
function count(text, pattern) {
    return [...text.matchAll(pattern)].length;
}

/** @param {readonly {path: string, text: string}[]} files */
export function storeScopeProblems(files) {
    return files
        .filter((file) => IN_SOURCE.test(file.path))
        .filter((file) => {
            const created = count(file.text, CREATES);

            return created > count(file.text, SCOPED) + count(file.text, WINDOW);
        })
        .map(
            (file) =>
                `${file.path}: creates a store that says nothing of what it lives for. ` +
                'Wrap it in `scopeToOrigin(…)`, or put `// store-scope: window — <reason>` above it.',
        );
}
