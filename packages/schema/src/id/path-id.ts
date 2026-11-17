import { IdError } from './id-error.js';
import { SEGMENT } from './segment-pattern.js';

/** Throws IdError unless the value is one safe id segment. */
export function assertSegment(segment: string): void {
    if (!SEGMENT.test(segment)) {
        throw new IdError(segment);
    }
}

/** Splits a path id into validated segments. */
export function segmentsOf(id: string): string[] {
    const segments = id.split('/');

    for (const segment of segments) {
        assertSegment(segment);
    }

    return segments;
}
