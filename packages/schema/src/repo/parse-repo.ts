import { FormatVersionError } from '../format/format-version-error.js';
import { parseWith } from '../format/parse-with.js';
import { REPO_FORMAT } from './repo-format.js';
import type { Repo } from './repo.js';
import { repoSchema } from './repo-schema.js';

/**
 * Parses the repo file. A formatVersion newer than this build knows does not open: it throws
 * FormatVersionError, which names the version, before any other field is read.
 */
export function parseRepo(input: unknown): Repo {
    const version = formatVersionOf(input);

    if (version !== undefined && version > REPO_FORMAT) {
        throw new FormatVersionError(version, REPO_FORMAT);
    }

    return parseWith(repoSchema, input);
}

function formatVersionOf(input: unknown): number | undefined {
    if (typeof input !== 'object' || input === null || !('formatVersion' in input)) {
        return undefined;
    }

    const candidate = input.formatVersion;

    if (typeof candidate !== 'number' || !Number.isSafeInteger(candidate) || candidate <= 0) {
        return undefined;
    }

    return candidate;
}
