import { parseWith } from '../format/parse-with.js';
import type { Connection } from './connection.js';
import { connectionSchema } from './connection-schema.js';

/** Parses one connection file. The URL scheme is checked here, at the border. */
export function parseConnection(input: unknown): Connection {
    return parseWith(connectionSchema, input);
}
