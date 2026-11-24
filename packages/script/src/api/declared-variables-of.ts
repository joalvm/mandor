/**
 * `mandor.variables.set(` and the text that names the variable, in double, single or back quotes.
 * A name with an escape, an interpolation or a line break in it is built while the script runs:
 * the editor cannot know it, so it does not match.
 */
const DECLARATION =
    /(?<![\w$.])mandor\s*\.\s*variables\s*\.\s*set\s*\(\s*("[^"\\\n]+"|'[^'\\\n]+'|`(?:[^`\\$\n]|\$(?!\{))+`)/gu;

/**
 * The variables a chain of scripts declares, each once, in the order the chain declares them:
 * the names it gives with `mandor.variables.set`, written out.
 */
export function declaredVariablesOf(texts: readonly string[]): string[] {
    const names = texts.flatMap((text) =>
        [...text.matchAll(DECLARATION)].map((found) => String(found[1]).slice(1, -1)),
    );

    return [...new Set(names)];
}
