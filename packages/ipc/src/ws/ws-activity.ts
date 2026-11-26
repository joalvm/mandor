import { entityNameSchema, slugSchema } from '@mandor/schema';
import { z } from 'zod';

/** One frame seen on the socket, inbound or outbound. */
export type ActivityRecord = {
    direction: 'in' | 'out';
    /** The text of the frame, or the base64 of its bytes when `binary` says so. */
    data: string;
    /**
     * Whether `data` carries bytes instead of text. A frame that is not UTF-8 would be
     * destroyed by the conversion, so it travels encoded and the window decodes it once.
     */
    binary?: boolean | undefined;
    /** Epoch milliseconds, for the timeline. */
    at: number;
    /**
     * The collection item this frame was sent from, when it was sent from one. A frame written
     * by hand in the composer, and every frame that arrives, came from no item and carries
     * nothing here.
     */
    origin?: string | undefined;
    /** The named event that carried the frame; the transports without names say nothing. */
    event?: string | undefined;
    /** The identifier of this emission, when it asked to hear back about it. */
    id?: string | undefined;
    /** The identifier of the emission this frame answers. */
    replyTo?: string | undefined;
    /** Whether this frame is the close of a wait that ran out of time. */
    timedOut?: boolean | undefined;
    /** Whether the frame left without meeting the schema its item promised. */
    schemaUnmet?: boolean | undefined;
    /** How long the answer took, measured from the emission it answers. */
    elapsedMs?: number | undefined;
};

const activityRecordSchema = z.object({
    direction: z.enum(['in', 'out']),
    data: z.string(),
    binary: z.boolean().optional(),
    at: z.number().int().nonnegative(),
    origin: entityNameSchema.optional(),
    event: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    replyTo: z.string().min(1).optional(),
    timedOut: z.boolean().optional(),
    schemaUnmet: z.boolean().optional(),
    elapsedMs: z.number().int().nonnegative().optional(),
}) satisfies z.ZodType<ActivityRecord>;

/**
 * The most the window keeps of the activity of one connection: this many entries, the largest
 * count the settings offer, and what they weigh in bytes. Main reads them too, so a batch past
 * them crosses with only its tail: the front would be dropped on arrival. The window keeps as
 * many as the person chose, never more than these.
 */
export const ACTIVITY_WINDOW_ENTRIES = 2000;
export const ACTIVITY_WINDOW_BYTES = 2 * 1024 * 1024;

/** Activity travels in batches: a busy socket must not become one IPC per frame. */
export type WsActivityPush = {
    connectionId: string;
    /** The concrete environment used when this socket was opened. */
    environmentId: string | null;
    records: ActivityRecord[];
};

export const wsActivityPushSchema = z.object({
    connectionId: slugSchema,
    environmentId: slugSchema.nullable(),
    records: z.array(activityRecordSchema),
}) satisfies z.ZodType<WsActivityPush>;
