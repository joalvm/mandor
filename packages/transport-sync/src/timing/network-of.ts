import type net from 'node:net';
import type tls from 'node:tls';

import type { SyncNetwork, SyncTlsDetails } from '../response/sync-network.js';

type CertificateNames = { CN?: string | string[]; O?: string | string[] } | undefined;

function nameOf(names: CertificateNames): string | undefined {
    const name = names?.CN ?? names?.O;

    return Array.isArray(name) ? name.join(', ') : name;
}

/**
 * What the handshake is read off: the version and the cipher agreed, and the certificate of the
 * peer as the runtime answers it. A repeated name comes as a list, and a socket without a peer
 * certificate answers an empty object, whatever the type of the runtime says.
 */
type Handshake = {
    getCipher: () => Pick<tls.CipherNameAndProtocol, 'standardName'>;
    getPeerCertificate: () => {
        issuer?: CertificateNames;
        subject?: CertificateNames;
        valid_to?: string;
    };
    getProtocol: () => string | null;
};

/** What the handshake settled on a secure socket, and who its certificate names. */
export function tlsDetailsOf(secure: Handshake): SyncTlsDetails {
    const certificate = secure.getPeerCertificate();
    const subject = nameOf(certificate.subject);
    const issuer = nameOf(certificate.issuer);

    return {
        protocol: secure.getProtocol() ?? '',
        cipher: secure.getCipher().standardName,
        ...(subject === undefined ? {} : { subject }),
        ...(issuer === undefined ? {} : { issuer }),
        ...(certificate.valid_to === undefined ? {} : { validTo: certificate.valid_to }),
    };
}

/** Both ends of a connected socket, plus the handshake when it is a secure one. */
export function networkOf(socket: net.Socket, details?: SyncTlsDetails): SyncNetwork {
    return {
        localAddress: socket.localAddress ?? '',
        localPort: socket.localPort ?? 0,
        remoteAddress: socket.remoteAddress ?? '',
        remotePort: socket.remotePort ?? 0,
        ...(details === undefined ? {} : { tls: details }),
    };
}
