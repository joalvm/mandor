import type { RequestItem } from '@mandor/schema';

/**
 * Which half of the request the user is reading. The strip keeps the order of the tools people
 * come from: the description, then what is sent, and the settings last. The query comes first to open: it is the smallest
 * thing to fix when a send went wrong. The section is remembered by the window, beside the
 * resource, and not by this feature.
 */
export const DEFAULT_REQUEST_SECTION = 'params';

export const REQUEST_SECTIONS = [
    'doc',
    'params',
    'path',
    'auth',
    'headers',
    'body',
    'schema',
    'scripts',
    'settings',
] as const;

export type RequestSection = (typeof REQUEST_SECTIONS)[number];

/**
 * When a section has something to say; one not named here always has. The path is what the url
 * asks for: with none, the tab would only be an empty room. The scripts are always there, to be
 * written. The schema is the shape a json body promises, so it stands beside a json body, and
 * beside any body once a schema is written, so changing the kind never hides what was written.
 */
const SHOWN: Partial<Record<RequestSection, (request: RequestItem) => boolean>> = {
    path: (request) => request.pathParams.length > 0,
    schema: (request) => request.body.type === 'json' || (request.bodySchema ?? '').trim() !== '',
};

/** The sections a request has something to say in, in the order of the strip. */
export function sectionsOf(request: RequestItem): RequestSection[] {
    return REQUEST_SECTIONS.filter((section) => SHOWN[section]?.(request) ?? true);
}

/** The section to draw: the one the window remembers, or the first when that one is gone. */
export function openSectionOf(
    remembered: string,
    sections: readonly RequestSection[],
): RequestSection {
    return sections.find((section) => section === remembered) ?? DEFAULT_REQUEST_SECTION;
}
