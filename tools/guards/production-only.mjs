/**
 * What may only exist while somebody is developing. An extension loaded from disk and a window
 * that opens the inspector by itself are conveniences on a machine with the repo checked out;
 * inside a signed build they are an unasked-for surface. The project rules promise they never
 * load in production, and a promise no gate holds is a sentence, not a rule.
 */

const DEV_ONLY = /\bloadExtension\(|\bopenDevTools\(|\bremoveExtension\(/;
const GUARDED = /isPackaged|import\.meta\.env\.DEV|NODE_ENV/;

/** @param {readonly {path: string, text: string}[]} files */
export function productionOnlyProblems(files) {
    return files
        .filter((file) => /\.tsx?$/.test(file.path))
        .filter((file) => DEV_ONLY.test(file.text) && !GUARDED.test(file.text))
        .map(
            (file) =>
                `${file.path}: opens developer tooling with nothing to stop it in a build. ` +
                'Guard it with `app.isPackaged` or `import.meta.env.DEV`.',
        );
}
