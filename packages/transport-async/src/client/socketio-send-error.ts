/** An emission that speaks Socket.IO without naming the event it is emitted to. */
export class SocketIoSendError extends Error {
    constructor() {
        super('a Socket.IO emission names the event it is emitted to');
        this.name = 'SocketIoSendError';
    }
}
