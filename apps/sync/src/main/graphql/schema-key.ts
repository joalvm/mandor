import { createHash } from 'node:crypto';

/**
 * Names the schema kept for a server: the url the request resolves to, in the environment it was
 * resolved in. Two requests that dial the same server share what one of them fetched, and the
 * same url under another environment is another server, with another schema to ask for. The
 * name is a hash, so what is in the url, a token in a query included, never reaches a file name.
 */
export function schemaKey(resolvedUrl: string, environmentId: string | null): string {
    return createHash('sha256')
        .update(`${resolvedUrl}\n${environmentId ?? '_none'}`)
        .digest('hex');
}
