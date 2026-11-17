import { createHash } from 'node:crypto';

/**
 * The identity of a collection of Bruno. Bruno gives a collection no id, so it is told by its
 * name, without case or margins: a re-import is an update, and a rename is a new collection.
 */
export function documentSourceId(name: string): string {
    return `collection:${createHash('sha256').update(name.trim().toLowerCase(), 'utf8').digest('hex')}`;
}
