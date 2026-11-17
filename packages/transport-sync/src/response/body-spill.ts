/**
 * The port the app hands the transport for bodies over the threshold. The transport never
 * touches the disk: it calls `open` when the body crosses the limit, writes each chunk there,
 * and asks `finish` for the reference when the body is done. `abort` discards what was written
 * when the request dies mid-body, so nothing half-written survives.
 */
export type BodySpill = {
    write: (chunk: Uint8Array) => Promise<void>;
    finish: (sha256: string) => Promise<string>;
    abort: () => Promise<void>;
};
