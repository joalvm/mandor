import { createHash } from 'node:crypto';

/**
 * The identity of an API: its title, said the same however it is spelled. An API changes its
 * version and its text with every release, and an identity of the text would turn each re-import
 * into a conflict on every row. What the user edited since is for the fingerprint to notice.
 */
export function documentSourceId(title: string): string {
    return createHash('sha256').update(title.trim().toLowerCase(), 'utf8').digest('hex');
}
