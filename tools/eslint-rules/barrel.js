import { basename, dirname } from 'node:path';

/**
 * The one file allowed to re-export and to be called `index`. Both file-shape rules need to
 * recognise it, and neither should guess at path separators.
 *
 * A package publishes itself through `src/index.ts`. A feature that lives inside an app has the
 * same surface for the same reason — the app imports the folder, not the files under it — so the
 * folder directly under `features/` gets one too. Only that folder: asking for the parent to be
 * `features` is what stops a second barrel from growing inside the feature.
 */
export function isBarrel(filename) {
    if (basename(filename) !== 'index.ts') {
        return false;
    }

    const folder = dirname(filename);

    return basename(folder) === 'src' || basename(dirname(folder)) === 'features';
}
