import { hasOwnScripts, type RequestItem } from '@mandor/schema';

import type { RequestSection } from './request-section.js';

type SectionMarks = { broken?: boolean; filled?: boolean };

/** The lines a send would carry: a disabled row is kept on disk and is not counted. */
function enabledIn(lines: readonly { enabled: boolean }[]): number {
    return lines.filter((line) => line.enabled).length;
}

/** An auth of its own: one that inherits says nothing here, it is the folder's to show. */
function hasOwnAuth(request: RequestItem): boolean {
    const { auth } = request;

    return auth !== undefined && !('inherit' in auth) && auth.type !== 'none';
}

/** Whether the section holds something to say. A quiet green dot, and nothing more. */
const FILLED: Partial<Record<RequestSection, (request: RequestItem) => boolean>> = {
    auth: hasOwnAuth,
    body: (request) => request.body.type !== 'none',
    doc: (request) => (request.description ?? '').trim() !== '',
    headers: (request) => enabledIn(request.headers) > 0,
    params: (request) => enabledIn(request.query) > 0,
    schema: (request) => (request.bodySchema ?? '').trim() !== '',
    scripts: (request) => hasOwnScripts(request.scripts),
};

/**
 * The sections whose dot answers to a verdict: the schema to the body that breaks it, the scripts
 * to the last send, where one of them stopped. What is wrong outweighs the green.
 */
const JUDGED: ReadonlySet<RequestSection> = new Set(['schema', 'scripts']);

/**
 * What a section tells from the strip without being opened: that it holds something, as a
 * quiet green dot. Whether what was typed is on the file yet is the tab of the request's to
 * say — the draft is of the whole item, and never of one section. Settings and the path say
 * nothing about content: they always have a value. The schema says, besides, whether the body
 * breaks it, and the scripts whether one of them stopped: then the dot is the broken one.
 */
export function marksOf(
    request: RequestItem,
    section: RequestSection,
    broken = false,
): SectionMarks {
    const holds = FILLED[section];

    if (holds === undefined) {
        return {};
    }

    if (!JUDGED.has(section)) {
        return { filled: holds(request) };
    }

    return { broken, filled: holds(request) && !broken };
}
