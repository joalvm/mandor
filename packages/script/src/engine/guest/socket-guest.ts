/**
 * `message`, the frame an `onMessage` script reads and cannot write (a write is said in a line and
 * does nothing), and `socket`, whose `send` leaves an effect for the connection. The sends of one
 * run stop at `SOCKET_SENDS`: past it the API says so once and leaves nothing (main counts them
 * again). Needs `I`, `SNAPSHOT`, `OUT`, `SOCKET_SENDS`, `show` and `warnLine`.
 */
export const SOCKET_GUEST = String.raw`
const MESSAGE = SNAPSHOT.message || { direction: 'incoming', binary: false };
const MESSAGE_FIELDS = ['text', 'direction', 'binary', 'event'];
const messageApi = {};

for (let index = 0; index < MESSAGE_FIELDS.length; index += 1) {
    const field = MESSAGE_FIELDS[index];

    I.define(messageApi, field, {
        enumerable: true,
        get: () => MESSAGE[field],
        set: () => noticeLine('message-field-readonly', { field: 'message.' + field }),
    });
}
let socketSends = 0;

const socketApi = {
    send(text) {
        socketSends += 1;

        if (socketSends === SOCKET_SENDS + 1) {
            noticeLine('socket-sends-cap', { limit: SOCKET_SENDS });
        }

        if (socketSends <= SOCKET_SENDS) {
            I.push(OUT.effects, { kind: 'socket', value: show(text) });
        }
    },
};
`;
