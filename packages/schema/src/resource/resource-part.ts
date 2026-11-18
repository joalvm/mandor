import { SEGMENT } from '../id/segment-pattern.js';
import { MAX_SEGMENT_LENGTH } from '../id/segment.js';
import { ResourceUriError } from './resource-uri-error.js';
import type { ResourceUriReason } from './resource-uri-reason.js';
import { RESOURCE_KINDS, type ResourceKind } from './resource-uri-syntax.js';

/** Control characters, both separators, and the rest of what three filesystems refuse. */
export const FORBIDDEN_IN_PATH = /[\p{Cc}"*/:<>?\\|]/u;

/** Repo, workspace and the name of a window resource are each one id segment, nothing else. */
export function assertNamePart(value: string, reason: ResourceUriReason): void {
    if (!SEGMENT.test(value)) {
        throw new ResourceUriError(reason, value);
    }
}

/** The list of kinds is closed. A URI naming one Mandor does not have opens nothing. */
export function assertKindPart(value: string): asserts value is ResourceKind {
    const kinds: readonly string[] = RESOURCE_KINDS;

    if (!kinds.includes(value)) {
        throw new ResourceUriError('kind', value);
    }
}

/** Splits a path into file names. Disk uses `\` on Windows; the URI uses `/` and only `/`. */
export function resourcePathSegments(path: string): string[] {
    const segments = path.replaceAll('\\', '/').split('/');

    for (const segment of segments) {
        assertPathSegment(segment);
    }

    return segments;
}

/**
 * Throws unless the segment is one file or folder name. `.` and `..` are rejected here and not
 * by searching the whole path for them: `URL` collapses `..` before anyone gets to look.
 */
export function assertPathSegment(segment: string): void {
    const rejected =
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        segment.length > MAX_SEGMENT_LENGTH ||
        FORBIDDEN_IN_PATH.test(segment);

    if (rejected) {
        throw new ResourceUriError('path', segment);
    }
}
