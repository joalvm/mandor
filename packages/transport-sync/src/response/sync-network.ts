/**
 * The connection that carried the response, as the socket saw it. Through a proxy the remote
 * end is the proxy, and the TLS of the target, negotiated by the tunnel, is not known.
 */
export type SyncNetwork = {
    localAddress: string;
    localPort: number;
    remoteAddress: string;
    remotePort: number;
    tls?: SyncTlsDetails;
};

/** What the TLS handshake settled, and who the certificate names. */
export type SyncTlsDetails = {
    protocol: string;
    cipher: string;
    subject?: string;
    issuer?: string;
    validTo?: string;
};
