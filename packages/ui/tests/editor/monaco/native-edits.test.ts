import { within } from '@testing-library/react';
import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it } from 'vitest';

import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';
import { routeNativeEdits } from '../../../src/editor/monaco/native-edits.js';

type Shown = { input: HTMLElement; shown: editor.IStandaloneCodeEditor };

function mounted(value: string): Shown {
    const host = document.body.appendChild(document.createElement('div'));
    const options = constructionOptions({
        ariaLabel: 'Editor',
        language: 'plaintext',
        options: {},
    });
    const shown = editor.create(host, { ...options, value });

    return { input: within(host).getByRole('textbox'), shown };
}

/** What the Edit menu of the window sends to the focused input: the browser's own commands. */
function fromTheMenu(target: Element, inputType: 'historyRedo' | 'historyUndo'): InputEvent {
    const event = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType });

    target.dispatchEvent(event);

    return event;
}

function selectAllFromTheMenu(target: Element): Event {
    const event = new Event('selectstart', { bubbles: true, cancelable: true });

    target.dispatchEvent(event);

    return event;
}

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
});

describe('the Edit menu of the window over an editor', () => {
    /** The browser's own undo knows nothing of the document; the document's history does. */
    it('takes back what was typed, and puts it back again', () => {
        const { input, shown } = mounted('a');

        routeNativeEdits(shown);
        shown.focus();
        shown.trigger('keyboard', 'type', { text: 'b' });

        const undone = fromTheMenu(input, 'historyUndo');

        expect(shown.getValue()).toBe('a');
        expect(undone.defaultPrevented).toBe(true);

        fromTheMenu(input, 'historyRedo');

        expect(shown.getValue()).toBe('ba');
    });

    it('selects the whole document, not the few lines its input holds', () => {
        const { input, shown } = mounted('one\ntwo\nthree');

        routeNativeEdits(shown);
        shown.focus();

        const selected = selectAllFromTheMenu(input);
        const selection = shown.getSelection();

        expect(selection === null ? '' : shown.getModel()?.getValueInRange(selection)).toBe(
            'one\ntwo\nthree',
        );
        expect(selected.defaultPrevented).toBe(true);
    });

    /**
     * The browser aims its undo at the field whose history it holds, which may be another one,
     * and its select all at the page when it sees no selection. While the editor holds the
     * focus, both are the editor's, wherever they were aimed.
     */
    it('answers the menu while it holds the focus, whatever the browser aimed it at', () => {
        const { shown } = mounted('a');
        const elsewhere = document.body.appendChild(document.createElement('div'));

        routeNativeEdits(shown);
        shown.focus();
        shown.trigger('keyboard', 'type', { text: 'b' });

        const undone = fromTheMenu(elsewhere, 'historyUndo');
        const selected = selectAllFromTheMenu(document.body);

        expect(shown.getValue()).toBe('a');
        expect(undone.defaultPrevented).toBe(true);
        expect(selected.defaultPrevented).toBe(true);
        elsewhere.remove();
    });

    /** The search field of the editor keeps the browser's undo and selection for its own text. */
    it('leaves alone whatever is not the text of the document', () => {
        const { input, shown } = mounted('a');

        routeNativeEdits(shown);
        shown.trigger('keyboard', 'type', { text: 'b' });

        const undone = fromTheMenu(input, 'historyUndo');

        expect(shown.getValue()).toBe('ba');
        expect(undone.defaultPrevented).toBe(false);
    });

    it('stops answering the menu once it is let go', () => {
        const { input, shown } = mounted('a');

        routeNativeEdits(shown).dispose();
        shown.focus();
        shown.trigger('keyboard', 'type', { text: 'b' });
        fromTheMenu(input, 'historyUndo');

        expect(shown.getValue()).toBe('ba');
    });
});
