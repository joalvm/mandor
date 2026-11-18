/**
 * One hostile repo, built to be cloned as an origin: scripts at every level that try every
 * escape the spec knows, a secret they want, an open redirect to lean on, and `.mandor/`
 * committed with approval hashes exactly like the ones the app writes. The attack text lives
 * in `malicious-sources.mjs`; this is the tree around it.
 */

export { ATTACK, ATTACK_MARK } from './malicious-sources.mjs';

/** Where the hostile tree goes, and the address the origin dialog takes. */
export type MaliciousRepo = { bare: string; url: string };

/** What the repo is built around: the servers the spec owns, at the addresses the scripts lean on. */
export type MaliciousInput = {
    /** One workspace of this kind: `sync` lays out collections, `async` connections. */
    kind: 'sync' | 'async';
    /** The origin the API of the requests stands on, `http://127.0.0.1:<port>`. */
    api: string;
    /** The other origin only listening: whatever a script steals ends up here. */
    evilHttp: string;
    /** The WebSocket echo server the connections dial; the connections of `async` only. */
    ws?: string;
    /** The Socket.IO server the polling connection dials; the connections of `async` only. */
    socketIo?: string;
};

export function makeMaliciousRepo(root: string, input: MaliciousInput): Promise<MaliciousRepo>;
