import { sep } from 'node:path';

/** What the repo separates its paths with, on every platform: git, the entities and the texts. */
const REPO_SEPARATOR = '/';

/**
 * The path a watcher event named, spelled as the repo spells it. The watcher speaks with the
 * separator of the platform; everything that reads its paths afterwards speaks with the repo's.
 */
export function repoPathOfEvent(filename: string, separator: string = sep): string {
    return filename.split(separator).join(REPO_SEPARATOR);
}
