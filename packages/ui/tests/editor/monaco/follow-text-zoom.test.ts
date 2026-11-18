import { fireEvent } from '@testing-library/react';
import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setTextZoom } from '../../../src/lib/text-zoom.js';
import { mountDiffEditor } from '../../../src/editor/monaco/mount-diff-editor.js';
import { mountEditor } from '../../../src/editor/monaco/mount-editor.js';

const disposals: (() => void)[] = [];

function host(): HTMLElement {
    return document.body.appendChild(document.createElement('div'));
}

function editorIn(element: HTMLElement): editor.ICodeEditor {
    const shown = editor.getEditors().find((each) => element.contains(each.getContainerDomNode()));

    if (shown === undefined) {
        throw new Error('nothing mounted');
    }

    return shown;
}

function mountCode(element: HTMLElement): editor.ICodeEditor {
    const target = { ariaLabel: 'Payload', language: 'jsonc', modelKey: 'k', options: {} } as const;
    const mounted = mountEditor(element, { ...target, value: '{}' }, vi.fn());

    disposals.push(mounted.dispose);

    return editorIn(element);
}

function typeOf(shown: editor.ICodeEditor): { fontSize: number; lineHeight: number } {
    return {
        fontSize: shown.getOption(editor.EditorOption.fontSize),
        lineHeight: shown.getOption(editor.EditorOption.lineHeight),
    };
}

afterEach(() => {
    disposals.splice(0).forEach((dispose) => {
        dispose();
    });
    document.body.replaceChildren();
    setTextZoom(0);
});

describe('editors at the size the reader put the text of the window at (follow-text-zoom)', () => {
    it('opens an editor at the step the text is at, its lines as far apart for that size', () => {
        setTextZoom(5);

        expect(typeOf(mountCode(host()))).toEqual({ fontSize: 18, lineHeight: 27 });
    });

    /** One size for the window: whatever was enlarged over one editor is enlarged in all of them. */
    it('resizes every open editor when the step moves, wherever it was moved from', () => {
        const first = mountCode(host());
        const second = mountCode(host());

        setTextZoom(10);

        expect(typeOf(first)).toEqual({ fontSize: 24, lineHeight: 36 });
        expect(typeOf(second)).toEqual({ fontSize: 24, lineHeight: 36 });
    });

    it('lets the reader resize the text with the wheel over the editor', () => {
        const element = host();
        const shown = mountCode(element);

        fireEvent.wheel(element, { ctrlKey: true, deltaY: -100 });

        expect(shown.getOption(editor.EditorOption.fontSize)).toBeCloseTo(13.2);
    });

    it('resizes both panes of a diff', () => {
        const element = host();
        const diff = mountDiffEditor(
            element,
            {
                language: 'plaintext',
                modified: 'b',
                modifiedLabel: 'Mine',
                original: 'a',
                originalLabel: 'Incoming',
                readOnly: false,
            },
            vi.fn(),
        );

        disposals.push(diff.dispose);
        fireEvent.wheel(element, { ctrlKey: true, deltaY: -100 });

        const [shown] = editor
            .getDiffEditors()
            .filter((each) => element.contains(each.getContainerDomNode()));

        expect(shown?.getOriginalEditor().getOption(editor.EditorOption.fontSize)).toBeCloseTo(
            13.2,
        );
        expect(shown?.getModifiedEditor().getOption(editor.EditorOption.fontSize)).toBeCloseTo(
            13.2,
        );
    });

    it('stops following the step once the editor is let go', () => {
        const element = host();

        mountCode(element);
        disposals.splice(0).forEach((dispose) => {
            dispose();
        });

        expect(() => {
            setTextZoom(3);
        }).not.toThrow();
        expect(fireEvent.wheel(element, { ctrlKey: true, deltaY: -100 })).toBe(true);
    });
});
