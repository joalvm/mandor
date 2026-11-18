import { parseWith } from '../format/parse-with.js';
import type { Environment } from './environment.js';
import { environmentSchema } from './environment-schema.js';

/** Parses one environment file. The variable name syntax is checked here, at the border. */
export function parseEnvironment(input: unknown): Environment {
    return parseWith(environmentSchema, input);
}
