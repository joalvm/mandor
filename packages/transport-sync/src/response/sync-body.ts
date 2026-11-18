/**
 * The response body. Under the spill threshold it stays in memory as raw bytes; over it, the
 * bytes went to the spill the app opened and only the reference, the count and the hash remain.
 */
export type SyncBody =
    | { kind: 'inline'; bytes: Uint8Array }
    | { kind: 'spilled'; ref: string; bytes: number; sha256: string };
