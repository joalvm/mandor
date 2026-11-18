import { createConnection, slugify, type Connection } from '@mandor/schema';
import type { ConnectionArea } from '../connection/connection-area.js';
import type { Result } from '../result/result.js';
import { success } from '../result/success.js';

/**
 * The connection a test gets when it says nothing about connections: one that answers with a
 * valid domain value, so what the test passes as an override is the only thing it is saying.
 */
export function defaultConnection(): ConnectionArea {
    const saved = (name: string, url: string): Promise<Result<Connection>> =>
        Promise.resolve(success(createConnection({ id: slugify(name), name, url })));

    return {
        create: (input) =>
            Promise.resolve(
                success(
                    createConnection({
                        id: slugify(input.name),
                        name: input.name,
                        url: input.url,
                        ...(input.transport === undefined ? {} : { transport: input.transport }),
                    }),
                ),
            ),
        list: () => Promise.resolve(success([])),
        update: () => saved('Gateway', 'ws://localhost:8080'),
        delete: () => Promise.resolve(success({})),
    };
}
