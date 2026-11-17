import { createHash } from 'node:crypto';

/**
 * The identity of a HAR: a recording has no id of its own, so it is told by its bytes. The same
 * file imported twice is the same document; a recording with one more entry is another.
 */
export function documentSourceId(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}
