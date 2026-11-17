import type { InteropFile, InteropRead, InteropScope } from '@mandor/interop-core';

/** What main hands the worker of an import: the format by its id, and what it reads. */
export type ImportReadRequest = {
    formatId: string;
    files: InteropFile[];
    scope: InteropScope;
};

/**
 * What the worker answers. An error does not cross threads as itself, so the refusal of a
 * format travels as its problems and anything else as its message.
 */
export type ImportReadReply =
    | { kind: 'read'; read: InteropRead }
    | { kind: 'refused'; problems: string[] }
    | { kind: 'failed'; message: string };
