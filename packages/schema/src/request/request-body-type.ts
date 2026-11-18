/**
 * How the body of a request is meant to be read. A closed list: the editor that highlights and
 * the sender that frames are decisions, and a free string would leave both to chance.
 */
export const REQUEST_BODY_TYPES = [
    'none',
    'json',
    'text',
    'xml',
    'urlencoded',
    'form',
    'binary',
    'graphql',
] as const;

export type RequestBodyType = (typeof REQUEST_BODY_TYPES)[number];
