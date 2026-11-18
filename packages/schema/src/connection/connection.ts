import type { AuthConfig } from '../auth/auth-config.js';
import type { ItemOrigin } from '../collection/item-origin.js';
import type { RequestLine } from '../request/request-line.js';
import type { ConnectionScripts } from '../script/own-scripts.js';
import type { ConnectionTransport } from './connection-transport.js';
import type { HandshakeOptions } from './handshake-options.js';
import type { KeepaliveOptions } from './keepalive-options.js';
import type { RetryOptions } from './retry-options.js';
import type { SocketIoOptions } from './socketio-options.js';
import type { WebsocketOptions } from './websocket-options.js';

/** A persisted async connection. It resolves `{{var}}` against exactly one environment. */
export type Connection = {
    id: string;
    name: string;
    transport: ConnectionTransport;
    url: string;
    /**
     * The headers of the handshake, as the headers table keeps them: a list, the ones switched
     * off kept but not sent, each with what it promises about its value.
     */
    headers: RequestLine[];
    /**
     * The query this connection dials with, as the params table keeps it. The url stays the
     * owner of its path and of any query written inside it; these lines ride after what the
     * url already carries, the ones switched off kept but not sent.
     */
    params?: RequestLine[] | undefined;
    /** Environment this connection interpolates against; null until one is chosen. */
    environmentId: string | null;
    /**
     * What this connection is for, in markdown. It is read and written where the connection is
     * used, and it is absent until somebody writes it: an empty field is not a description.
     */
    description?: string | undefined;
    /**
     * The auth of the handshake. Absent inherits from the workspace; written, it rules over
     * what the workspace said.
     */
    auth?: AuthConfig | undefined;
    /**
     * Whether restoring the window may open this connection. Absent is the same as no: a tab
     * that came back says what was being looked at, not that a socket should be dialled.
     */
    autoConnect?: boolean | undefined;
    /** The settings this connection dials its websocket with. Absent fields are the defaults. */
    websocket?: WebsocketOptions | undefined;
    /** The settings this connection dials Socket.IO with. Absent fields are the defaults. */
    socketio?: SocketIoOptions | undefined;
    /**
     * Where this connection came from. Absent means a person wrote it. Present names the
     * import that did, so a re-import updates it in place instead of duplicating it.
     */
    origin?: ItemOrigin | undefined;
    /** How this connection comes back when the server hangs up. Absent fields are the defaults. */
    retry?: RetryOptions | undefined;
    /** Whether this connection proves it is alive while quiet. Absent fields are the defaults. */
    keepalive?: KeepaliveOptions | undefined;
    /** How this connection opens: how long its handshake may take. Absent fields are the defaults. */
    handshake?: HandshakeOptions | undefined;
    /** The scripts the user wrote for this connection, one per event. Absent until somebody writes one. */
    scripts?: ConnectionScripts | undefined;
};
