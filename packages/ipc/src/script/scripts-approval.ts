import { SCRIPT_EVENTS, SCRIPT_LEVELS, slugSchema } from '@mandor/schema';
import { z } from 'zod';

import { resultSchema } from '../result/result-schema.js';

/** How many scripts one `status` asks about. */
export const SCRIPTS_STATUS_MAX = 64;

/**
 * Characters of one script the wire carries. A text over the real limit, in bytes, still gets its
 * answer (`tooLarge`) instead of a refusal of the shape; this only keeps a message from being
 * unbounded. The characters are never fewer than the bytes' worth the limit allows.
 */
const SOURCE_MAX_CHARS = 2 * 1024 * 1024;

/** A script as the window holds it: the workspace and place it sits in, and its text. */
const scriptRefSchema = z
    .object({
        workspaceId: slugSchema,
        level: z.enum(SCRIPT_LEVELS),
        event: z.enum(SCRIPT_EVENTS),
        source: z.string().max(SOURCE_MAX_CHARS),
    })
    .strict();

/**
 * Approving a script. The origin is never sent: main puts the one that is open. With
 * `previousSource` it is a key typed in a text the person was already editing: main approves only
 * if that earlier text was approved or empty, so a text that came from outside is not washed by a
 * key. Without it, it is the button, an act of its own.
 */
export const scriptsApproveRequestSchema = scriptRefSchema
    .extend({ previousSource: z.string().max(SOURCE_MAX_CHARS).optional() })
    .strict();

export const scriptsApproveResultSchema = resultSchema(
    z.object({ approved: z.boolean() }).strict(),
);

export const scriptsStatusRequestSchema = z
    .object({ scripts: z.array(scriptRefSchema).max(SCRIPTS_STATUS_MAX) })
    .strict();

const SCRIPT_STATUSES = ['approved', 'unapproved', 'tooLarge'] as const;

/** One status for each script asked, in the order they were asked. */
export const scriptsStatusResultSchema = resultSchema(
    z.object({ statuses: z.array(z.enum(SCRIPT_STATUSES)) }).strict(),
);

export const scriptsForgetRequestSchema = z.object({}).strict();

/** Forgets what scripts set in a workspace of the origin open, in every environment. */
export const scriptsClearVariablesRequestSchema = z
    .object({ workspaceId: z.string().min(1) })
    .strict();

const scriptsSwitchStateSchema = z.object({ enabled: z.boolean() }).strict();

export const scriptsSwitchReadResultSchema = resultSchema(scriptsSwitchStateSchema);

export const scriptsSwitchWriteRequestSchema = scriptsSwitchStateSchema;

export type ScriptsApproveRequest = z.infer<typeof scriptsApproveRequestSchema>;
export type ScriptsStatusRequest = z.infer<typeof scriptsStatusRequestSchema>;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];
export type ScriptsSwitchState = z.infer<typeof scriptsSwitchStateSchema>;
