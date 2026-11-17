/**
 * How many bytes the wire carried and how many the body is once decoded. `transferredBytes`
 * counts what arrived over the socket, before any `content-encoding` is undone; `bodyBytes`
 * counts the body the user finally sees. `decoded` is false when the encoding is one the
 * transport does not know: then the bytes are the raw ones and nothing was undone.
 */
export type SyncSizes = {
    transferredBytes: number;
    bodyBytes: number;
    decoded: boolean;
};
