import { within } from '@testing-library/react';
import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MARKDOWN_PREVIEW_EVENT } from '../../../src/editor/markdown-preview.js';
import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';

type Key = { ctrlKey?: boolean; key: string; keyCode: number };

const ENTER: Key = { key: 'Enter', keyCode: 13 };
const CTRL_K: Key = { ctrlKey: true, key: 'k', keyCode: 75 };
/** The second key of the chord goes alone, as in VS Code. */
const V: Key = { key: 'v', keyCode: 86 };

/** A markdown editor built the way the app builds one, with the caret at the end of the text. */
function writing(value: string): { input: HTMLElement; shown: editor.IStandaloneCodeEditor } {
    const host = document.body.appendChild(document.createElement('div'));
    const options = constructionOptions({ ariaLabel: 'Doc', language: 'markdown', options: {} });
    const model = editor.createModel(value, 'markdown');
    const shown = editor.create(host, { ...options, model });
    const last = model.getLineCount();

    shown.focus();
    shown.setPosition({ column: model.getLineMaxColumn(last), lineNumber: last });

    return { input: within(host).getByRole('textbox'), shown };
}

function press(target: Element, key: Key): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...key }));
}

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        const model = shown.getModel();

        shown.getContainerDomNode().remove();
        shown.dispose();
        model?.dispose();
    });
});

describe('writing markdown', () => {
    it('goes on with the list when Enter is pressed at the end of an item', () => {
        const { input, shown } = writing('- one');

        press(input, ENTER);

        expect(shown.getValue()).toBe('- one\n- ');
    });

    it('ends the list when Enter is pressed on an item with nothing in it', () => {
        const { input, shown } = writing('1. one\n2. ');

        press(input, ENTER);

        expect(shown.getValue()).toBe('1. one\n');
    });

    it('breaks a plain line the way any editor does', () => {
        const { input, shown } = writing('prose');

        press(input, ENTER);

        expect(shown.getValue()).toBe('prose\n');
    });

    /** The editor does not know who draws a preview: it asks the page around it, with a chord. */
    it('asks the page for the preview beside it on Ctrl+K V', () => {
        const { input, shown } = writing('# Doc');
        const asked = vi.fn();

        document.body.addEventListener(MARKDOWN_PREVIEW_EVENT, asked);
        press(input, CTRL_K);
        press(input, V);
        document.body.removeEventListener(MARKDOWN_PREVIEW_EVENT, asked);

        expect(asked).toHaveBeenCalledOnce();
        expect(shown.getValue()).toBe('# Doc');
    });
});
