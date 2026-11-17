import { firstText } from '../document/node-access.js';

/**
 * What an operation is called: its summary, else its id, else the method and the path, which no
 * other operation can share. A name already taken moves on to the next candidate, because the
 * name is what the request item is called and two of them would be one.
 */
export function operationName(
    operation: Record<string, unknown>,
    where: { method: string; path: string },
    taken: Set<string>,
): string {
    const free = [operation['summary'], operation['operationId']]
        .map((candidate) => firstText(candidate))
        .find((candidate) => candidate !== undefined && !taken.has(candidate));
    const name = free ?? `${where.method} ${where.path}`;

    taken.add(name);

    return name;
}
