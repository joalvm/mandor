import { createHash } from 'node:crypto';

/**
 * The identity of an Insomnia collection: the id Insomnia gave its workspace, so a re-import is
 * an update and a rename is not a new thing. A file with no id is told by its name, without
 * case or margins.
 */
export function documentSourceId(id: string | null | undefined, name: string): string {
    if (id !== undefined && id !== null && id !== '') {
        return `workspace:${id}`;
    }

    return `workspace:${createHash('sha256').update(name.trim().toLowerCase(), 'utf8').digest('hex')}`;
}
