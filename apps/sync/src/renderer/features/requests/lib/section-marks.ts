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
    scripts: (request) =>
        hasOwnScripts(request.scripts) || (request.importedScripts ?? []).length > 0,
};

/** The sections whose dot answers to the verdict of the body: a rule broken outweighs the green. */
const JUDGED: ReadonlySet<RequestSection> = new Set(['schema']);

/**
 * What a section tells from the strip without being opened: that it holds something, as a
 * quiet green dot. Whether what was typed is on the file yet is the tab of the request's to
 * say — the draft is of the whole item, and never of one section. Settings and the path say
 * nothing about content: they always have a value. The schema says, besides, whether the body
 * breaks it, and then its dot is the broken one and never the green.
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
