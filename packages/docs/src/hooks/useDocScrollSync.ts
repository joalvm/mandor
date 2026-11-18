import type { CodeEditorHandle } from '@mandor/ui';
import { useRef, type RefObject } from 'react';

import { docAnchors } from '../lib/doc-anchors.js';
import { lineForTop, topForLine } from '../lib/doc-scroll-map.js';

type DocScrollSync = {
    editorRef: RefObject<CodeEditorHandle | null>;
    pageRef: RefObject<HTMLDivElement | null>;
};

/** What one half hands back: what to hear from it, and how to say it is the one being moved. */
type DocSide = { onPointerEnter: () => void; onScroll: () => void };

/**
 * Keeps the markdown and the page on the same part of the document. Either half can be the one
 * being moved, and which one it is is decided by where the pointer is: two halves that both
 * push each other never settle, because every correction is another scroll to answer.
 *
 * Nothing is synced while the pointer is over neither — a wheel has to be over something — so a
 * split that is only being looked at stays exactly where its reader left both sides.
 */
export function useDocScrollSync({ editorRef, pageRef }: DocScrollSync): {
    code: DocSide;
    page: DocSide;
} {
    const leaderRef = useRef<'code' | 'page' | null>(null);

    return {
        code: {
            onPointerEnter: () => {
                leaderRef.current = 'code';
            },
            onScroll: () => {
                const page = pageRef.current;

                if (leaderRef.current !== 'code' || page === null) {
                    return;
                }

                page.scrollTop = topForLine(docAnchors(page), editorRef.current?.topLine() ?? 1);
            },
        },
        page: {
            onPointerEnter: () => {
                leaderRef.current = 'page';
            },
            onScroll: () => {
                const page = pageRef.current;

                if (leaderRef.current !== 'page' || page === null) {
                    return;
                }

                editorRef.current?.showLine(lineForTop(docAnchors(page), page.scrollTop));
            },
        },
    };
}
