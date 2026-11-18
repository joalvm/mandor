import { parseWith } from '../format/parse-with.js';
import type { Workspace } from './workspace.js';
import { workspaceSchema } from './workspace-schema.js';

/** Parses one workspace.yaml. What zod does not validate does not exist on disk. */
export function parseWorkspace(input: unknown): Workspace {
    return parseWith(workspaceSchema, input);
}
