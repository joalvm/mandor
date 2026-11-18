import { createHash } from 'node:crypto';

/**
 * The identity of a Postman file: the id Postman gave it, so a re-import is an update and a
 * rename is not a new thing. A file with no id is told by its name, without case or margins.
 */
export function documentSourceId(
    kind: 'collection' | 'environment' | 'globals',
    id: string | undefined,
    name: string,
): string {
    if (id !== undefined && id !== '') {
        return `${kind}:${id}`;
    }

    return `${kind}:${createHash('sha256').update(name.trim().toLowerCase(), 'utf8').digest('hex')}`;
}
