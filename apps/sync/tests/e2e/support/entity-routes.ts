import type { IncomingMessage, ServerResponse } from 'node:http';

/** What the entity routes saw, one list per route: the path and the `authorization`, in order. */
export type EntityLogs = {
    pets: string[];
    users: string[];
};

function logOf(pathname: string, logs: EntityLogs): string[] | undefined {
    if (pathname.startsWith('/pets/')) {
        return logs.pets;
    }

    return pathname.startsWith('/users/') ? logs.users : undefined;
}

/**
 * `/pets/<id>` and `/users/<id>` answer with the path and the `authorization` they were asked
 * with, and keep both for the test to read. True when the path was one of them.
 */
export function serveEntity(
    pathname: string,
    request: IncomingMessage,
    response: ServerResponse,
    logs: EntityLogs,
): boolean {
    const log = logOf(pathname, logs);

    if (log === undefined) {
        return false;
    }

    const authorization = request.headers.authorization ?? null;

    log.push(`${pathname} ${authorization ?? ''}`.trim());
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ authorization, path: pathname }));

    return true;
}
