import { bridge, shellStore } from '@mandor/shell';

import { openDoc } from './open-doc.js';
import type { LinkRefusal } from './open-resource-link.js';

/** What stands before the first colon, when nothing that ends a scheme got there first. */
const SCHEME = /^[^/?#:]+:/u;

/** The two ways a doc written outside the app spells the file of another one. */
const PATH_DRESSING = /^\.\/|\.md$/giu;

function decoded(href: string): string {
    try {
        return decodeURIComponent(href);
    } catch {
        return href;
    }
}

/**
 * The title a link of a doc names, or `null` for a link that names something else. The file of a
 * doc is an id nobody can write, so a link with no scheme and no anchor is read as the title.
 * `./Guía.md` is how the same link reads in a doc that came from outside, and it names the same.
 */
export function titleOfLink(href: string): string | null {
    if (href.startsWith('#') || href.startsWith('//') || SCHEME.test(href)) {
        return null;
    }

    return decoded(href).replace(PATH_DRESSING, '');
}

function sameTitle(left: string, right: string): boolean {
    return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
}

/**
 * Opens the doc of the workspace with that title, and answers with the reason it did not. Two docs
 * can share a title, and then the first of the list, which is the one the reader sees first.
 */
export async function openDocTitled(title: string, aside: boolean): Promise<LinkRefusal | null> {
    const workspaceId = shellStore.getState().activeWorkspaceId;

    if (workspaceId === null) {
        return 'linkMissing';
    }

    const docs = await bridge.doc.list({ workspaceId });
    const doc = docs.ok ? docs.value.find((listed) => sameTitle(listed.title, title)) : undefined;

    if (doc === undefined) {
        return 'linkMissing';
    }

    openDoc(workspaceId, doc.name, { aside });

    return null;
}
