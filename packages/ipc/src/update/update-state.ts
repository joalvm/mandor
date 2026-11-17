import { z } from 'zod';

import { errorCodeSchema, type ErrorCode } from '../result/error-code.js';
import { resultSchema } from '../result/result-schema.js';

/** More than this of release notes is cut: they travel on every change of the state. */
export const UPDATE_NOTES_MAX = 64 * 1024;

const UPDATE_PHASES = ['idle', 'checking', 'available', 'downloading', 'ready', 'error'] as const;

/**
 * How far this install can follow the updates. `full` downloads and installs by itself, and
 * `manual-only` can tell there is a new version and nothing else; `unsupported` has nothing to
 * say, so the window draws nothing for it.
 */
const UPDATE_SUPPORTS = ['full', 'manual-only', 'unsupported'] as const;

export type UpdatePhase = (typeof UPDATE_PHASES)[number];
export type UpdateSupport = (typeof UPDATE_SUPPORTS)[number];

/** The version main found, as the feed describes it. */
export type UpdateNext = {
    version: string;
    /** Markdown, or plain text: whatever the feed carried, for the window to sanitize. */
    notes?: string | undefined;
    date?: string | undefined;
};

/** What the person can be told about the updates, and nothing of how main finds them. */
export type UpdateState = {
    phase: UpdatePhase;
    support: UpdateSupport;
    /** The version that runs. */
    current: string;
    next?: UpdateNext | undefined;
    /** A whole percent, only while something is downloading. */
    progress?: number | undefined;
    error?: ErrorCode | undefined;
};

const updateNextSchema = z
    .object({
        version: z.string().min(1),
        notes: z.string().max(UPDATE_NOTES_MAX).optional(),
        date: z.string().min(1).optional(),
    })
    .strict() satisfies z.ZodType<UpdateNext>;

export const updateStateSchema = z
    .object({
        phase: z.enum(UPDATE_PHASES),
        support: z.enum(UPDATE_SUPPORTS),
        current: z.string().min(1),
        next: updateNextSchema.optional(),
        progress: z.number().int().min(0).max(100).optional(),
        error: errorCodeSchema.optional(),
    })
    .strict() satisfies z.ZodType<UpdateState>;

export const updateStateResultSchema = resultSchema(updateStateSchema);
