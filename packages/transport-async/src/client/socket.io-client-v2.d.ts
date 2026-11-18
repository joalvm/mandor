// The v2 client ships no types of its own: the surface Mandor dials with, and nothing more.
declare module 'socket.io-client-v2' {
    const io: (uri: string, options?: Record<string, unknown>) => unknown;

    export = io;
}
