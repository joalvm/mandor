import type { RedirectHop } from '../redirect/redirect-hop.js';
import type { SyncTimings } from '../timing/sync-timings.js';
import type { SyncBody } from './sync-body.js';
import type { SyncHeadSizes } from '../send/head-sizes.js';
import type { SyncNetwork } from './sync-network.js';
import type { SyncSizes } from './sync-sizes.js';

/**
 * What a request produced. Headers are a list in wire order, repeated names included, exactly
 * as the server sent them. `httpVersion` says whether the response came over HTTP/1.1 or
 * HTTP/2, negotiated by the transport, not chosen by the user. The sizes add the heads of
 * both directions to what the body reader counted.
 */
export type SyncResponse = {
    status: number;
    statusText: string;
    httpVersion: '1.1' | '2';
    headers: readonly (readonly [string, string])[];
    body: SyncBody;
    sizes: SyncSizes & SyncHeadSizes;
    timings: SyncTimings;
    redirects: RedirectHop[];
    /**
     * The URL whose 3xx is the answer because following it would take a secret to another origin.
     * Absent when nothing was held.
     */
    heldAt?: string;
    /** Absent when the connection could not be seen, as through a proxy tunnel. */
    network?: SyncNetwork;
};
