import { within } from '@testing-library/react';
import { editor, languages, Range } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';

type Key = { ctrlKey?: boolean; key: string; keyCode: number; shiftKey?: boolean };

const ENTER = 13;
const NEWLINE = '\n';

/** Built the way the app builds every editor. */
function mounted(value: string): { host: HTMLElement; shown: editor.IStandaloneCodeEditor } {
    const host = document.body.appendChild(document.createElement('div'));
    const options = constructionOptions({
        ariaLabel: 'Editor',
        language: 'plaintext',
        options: {},
    });

    return { host, shown: editor.create(host, { ...options, value }) };
}

function press(target: Element, key: Key): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...key });

    target.dispatchEvent(event);

    return event;
}

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
    delete document.documentElement.dataset['theme'];
});

describe('the editor of the window', () => {
    /**
     * Every language is a download and a registry entry. A few of them are opened as editors,
     * scripts among them under a name of their own; the rest are never opened on their own and
     * are held for the fenced blocks of a doc, which the markdown grammar colours in the language
     * the fence names.
     */
    it('knows the languages it opens and the ones a fenced block can name', () => {
        const ids = languages.getLanguages().map((language) => language.id);

        expect([...ids].sort()).toEqual([
            'bat',
            'binary',
            'csharp',
            'css',
            'dockerfile',
            'go',
            'graphql',
            'html',
            'ini',
            'java',
            'javascript',
            'json',
            'jsonc',
            'kotlin',
            'markdown',
            'php',
            'plaintext',
            'powershell',
            'python',
            'ruby',
            'rust',
            'script',
            'shell',
            'sql',
            'swift',
            'typescript',
            'xml',
            'yaml',
        ]);
    });

    /** A fence says the language in the word a person writes, which is rarely the id. */
    it('colours a fenced block in the language the fence names', async () => {
        const fence = ['```ts', 'const a = 1;', '```'].join(NEWLINE);

        await vi.waitFor(() => {
            expect(editor.tokenize(fence, 'markdown')[1]?.[0]?.type).toBe('keyword.ts');
        });
    });

    it('reads bytes and JSON with comments', () => {
        expect(editor.tokenize('00000000: 7B  {', 'binary')[0]?.[0]?.type).toBe('comment.hexdump');
        expect(editor.tokenize('// note', 'jsonc')[0]?.[0]?.type).toBe('comment.json');
    });

    it('draws in the theme of the window and follows it when it changes', async () => {
        const { shown } = mounted('');

        expect(shown.getDomNode()?.classList.contains('vs')).toBe(true);

        document.documentElement.dataset['theme'] = 'dark';

        await vi.waitFor(() => {
            expect(shown.getDomNode()?.classList.contains('vs-dark')).toBe(true);
        });
    });

    it('draws the high-contrast themes of the window in the high-contrast themes of Monaco', async () => {
        const { shown } = mounted('');

        document.documentElement.dataset['theme'] = 'dark-contrast';

        await vi.waitFor(() => {
            expect(shown.getDomNode()?.classList.contains('hc-black')).toBe(true);
        });

        document.documentElement.dataset['theme'] = 'light-contrast';

        await vi.waitFor(() => {
            expect(shown.getDomNode()?.classList.contains('hc-light')).toBe(true);
        });
    });

    /**
     * The menu of a right click is the one Monaco ships. Its cut, copy and paste are offered only
     * where the browser runs those commands, and jsdom runs none: the window shows them.
     */
    it('opens the menu Monaco ships on a right click', () => {
        const { shown } = mounted('a');

        expect(shown.getContribution('editor.contrib.contextmenu')).not.toBeNull();
    });

    /** Ctrl+Enter sends what the composer holds, and the editor would first add a line to it. */
    it('keeps its line keys but leaves Ctrl+Enter to whoever holds it', () => {
        const { host, shown } = mounted('a');
        const input = within(host).getByRole('textbox');

        shown.focus();

        const sent = press(input, { ctrlKey: true, key: 'Enter', keyCode: ENTER });

        expect(shown.getValue()).toBe('a');
        expect(sent.defaultPrevented).toBe(false);

        press(input, { ctrlKey: true, key: 'Enter', keyCode: ENTER, shiftKey: true });

        expect(shown.getValue()).toBe('\na');
    });

    /**
     * A document written on Windows would otherwise reach the repo with a carriage return on
     * every line, and read as a whole file rewritten by whoever opened it.
     */
    it('breaks the lines of every document with a line feed, on any machine', () => {
        const model = editor.createModel('a', 'plaintext');

        model.applyEdits([{ range: new Range(1, 1, 1, 1), text: NEWLINE }]);

        expect(model.getEndOfLineSequence()).toBe(editor.EndOfLineSequence.LF);
        expect(model.getValue()).toBe('\na');

        model.dispose();
    });
});
