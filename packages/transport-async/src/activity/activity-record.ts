// This type mirrors the contract on purpose: the package may not import it.
// jscpd:ignore-start
/**
 * One frame seen on a connection, inbound or outbound. Mirrors the `ActivityRecord` of
 * `@mandor/ipc` field for field, so a batch crosses the bridge without mapping — but this
 * package does not import the contract: traffic stays traffic.
 */
export type ActivityRecord = {
    direction: 'in' | 'out';
    /** The text of the frame, or the base64 of its bytes when `binary` says so. */
    data: string;
    /** Whether `data` carries bytes: a frame that is not UTF-8 dies on the way to a string. */
    binary?: boolean | undefined;
    /** Epoch milliseconds, for the timeline. */
    at: number;
    /** What the frame was sent from, when the caller named it. Nothing arrives with one. */
    origin?: string | undefined;
    /** The named event that carried the frame; the transports without names say nothing. */
    event?: string | undefined;
    /** The identifier of this emission, when the caller asked to hear back about it. */
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
// jscpd:ignore-end

/**
 * The record of one frame seen now, with the name of what carried it when there is one. Bytes
 * are encoded here and nowhere else: the record is what leaves this package, and a frame that
 * never was text has to reach the window whole.
 */
export function recordOf(
    direction: 'in' | 'out',
    data: string | Uint8Array,
    origin: string | undefined,
    event: string | undefined,
): ActivityRecord {
    const seen = { at: Date.now(), direction, event, origin };

    if (typeof data === 'string') {
        return { ...seen, data };
    }

    // A view over the bytes where they lie: `Buffer.from(bytes)` copied every frame once more.
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);

    return { ...seen, binary: true, data: bytes.toString('base64') };
}
