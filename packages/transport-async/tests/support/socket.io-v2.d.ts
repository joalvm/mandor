// The v2 server ships no types of its own: the surface the suite drives, and nothing more.
declare module 'socket.io-v2' {
    import type { Server } from 'node:http';

    type V2Server = {
        on: (event: 'connection', listener: (socket: never) => void) => void;
        close: (done?: () => void) => void;
    };

    const createServer: (http: Server) => V2Server;

    export = createServer;
}
