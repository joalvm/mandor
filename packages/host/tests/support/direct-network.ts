import type { NetworkFor } from '../../src/network/network-for.js';

/** A machine with no proxy and no certificates of its own: every url is dialed straight. */
export const DIRECT_NETWORK: NetworkFor = () => Promise.resolve({ tls: {} });
