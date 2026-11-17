import { parseFrameTemplate, socketIoOptionsSchema, websocketOptionsSchema } from '@mandor/schema';

// The settings rows hold what is typed and write only what the file keeps. Each check is the one
// the file is read with, so a row and the disk never disagree on what a value may be.

/** Whether a typed namespace is one the file keeps: while it is not, nothing is written. */
export function namespaceWritable(raw: string): boolean {
    return socketIoOptionsSchema.shape.namespace.safeParse(raw).success;
}

/** Whether a typed engine path is one the file keeps: while it is not, nothing is written. */
export function enginePathWritable(raw: string): boolean {
    return socketIoOptionsSchema.shape.enginePath.safeParse(raw).success;
}

/** What the list of subprotocols says once a raw line has been read. */
export function subprotocolsOf(raw: string): string[] {
    return raw
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '');
}

/** Whether the line names subprotocols a handshake can offer, as many as the file keeps. */
export function subprotocolsDialable(raw: string): boolean {
    return websocketOptionsSchema.shape.subprotocols.safeParse(subprotocolsOf(raw)).success;
}

/** Blank is the template going away, and it reads; anything else has to parse and to fit. */
export function frameReads(raw: string): boolean {
    if (raw.trim() === '') {
        return true;
    }

    return websocketOptionsSchema.shape.frame.safeParse(raw).success && parseFrameTemplate(raw).ok;
}
