/** How loud an entry of the console is, as a browser sorts what its page printed. */
export type ConsoleLevel = 'error' | 'info' | 'log' | 'warn';

/** A part of an entry that opens on its own: the headers of a send, its body. */
export type ConsoleSection = {
    title: string;
    /** An object reads as a tree of `name: value`; text reads as it is. */
    value: unknown;
};

/** What the status of an answer says, and whether the server took the request or refused it. */
export type ConsoleStatus = { text: string; outcome: 'ok' | 'refused' };

/**
 * One entry of the console: a line of its own, with whatever opens under it. Nothing written in
 * it is ever read as markup.
 */
export type ConsoleEntry = {
    key: string;
    /** When it was written, in milliseconds. */
    at: number;
    level: ConsoleLevel;
    text: string;
    /** What happened, said under the line once it opens: the message of an error. */
    detail?: string | undefined;
    /** Where it came from, said faint at the end of the line, as a browser names the file. */
    source?: string | undefined;
    status?: ConsoleStatus | undefined;
    /** How long it took, already said in words. */
    time?: string | undefined;
    sections?: readonly ConsoleSection[] | undefined;
};
