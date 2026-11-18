/**
 * One frame seen on a socket. Text and binary travel apart, and binary is never coerced to
 * string: a frame that is not UTF-8 would be destroyed by the conversion, silently. A frame
 * that a named event carried says which one; the transports without names say nothing here.
 */
export type WsMessage =
    | { kind: 'text'; data: string; event?: string | undefined; replyTo?: string | undefined }
    | {
          kind: 'binary';
          data: Uint8Array;
          event?: string | undefined;
          replyTo?: string | undefined;
      };
