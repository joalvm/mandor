import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import '../../../src/editor/monaco/monaco-setup.js';
import { ghostModel } from '../../../src/editor/monaco/ghost-text.js';

let counter = 0;

/** An editor of scripts holding the text, with the caret at its end. */
function editorOf(text: string) {
    counter += 1;

    const host = document.body.appendChild(document.createElement('div'));
    const model = editor.createModel(
        text,
        'script',
        Uri.parse(`inmemory://mandor/ghost-${String(counter)}`),
    );
    const shown = editor.create(host, {
        ...constructionOptions({ ariaLabel: 'Editor', language: 'script', options: {} }),
        automaticLayout: false,
        model,
    });

    shown.setPosition(model.getPositionAt(text.length));
    shown.focus();

    return { host, model, shown };
}

async function askGhost(shown: editor.IStandaloneCodeEditor): Promise<void> {
    await shown.getAction('editor.action.inlineSuggest.trigger')?.run();
}

function ghostOf(host: HTMLElement): string {
    return [...host.querySelectorAll('.ghost-text-decoration, .ghost-text')]
        .map((part) => part.textContent)
        .join('');
}

const SET = 'mandor.variables.set(';
const PROPOSAL = '"token", mandor.response.json().token)';

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('the text the editor proposes after the caret', () => {
    it('is asked with the text and the offset of the caret, and shown greyed', async () => {
        const ghostTextOf = vi.fn(() => PROPOSAL);
        const { host, model, shown } = editorOf(SET);

        ghostModel(model, ghostTextOf);
        await askGhost(shown);

        await vi.waitFor(() => {
            expect(ghostOf(host)).toContain('mandor.response.json()');
        });
        expect(ghostTextOf).toHaveBeenCalledWith(SET, SET.length);
    }, 15_000);

    it('is written once Tab takes it', async () => {
        const { host, model, shown } = editorOf(SET);

        ghostModel(model, () => PROPOSAL);
        await askGhost(shown);
        await vi.waitFor(() => {
            expect(ghostOf(host)).not.toBe('');
        });
        shown.trigger('keyboard', 'editor.action.inlineSuggest.commit', {});

        expect(model.getValue()).toBe(`${SET}${PROPOSAL}`);
    }, 15_000);

    it('is nothing where the caller proposes nothing', async () => {
        const { host, model, shown } = editorOf(SET);
        const ghostTextOf = vi.fn(() => undefined);

        ghostModel(model, ghostTextOf);
        await askGhost(shown);

        await vi.waitFor(() => {
            expect(ghostTextOf).toHaveBeenCalled();
        });
        expect(ghostOf(host)).toBe('');
    }, 15_000);

    it('is given to the document that asked and to no other', async () => {
        const mine = editorOf(SET);
        const other = editorOf(SET);
        const ghostTextOf = vi.fn(() => PROPOSAL);

        ghostModel(mine.model, ghostTextOf);
        other.shown.focus();
        await askGhost(other.shown);
        mine.shown.focus();
        await askGhost(mine.shown);

        await vi.waitFor(() => {
            expect(ghostOf(mine.host)).not.toBe('');
        });
        expect(ghostOf(other.host)).toBe('');
        expect(ghostTextOf).toHaveBeenCalledTimes(1);
    }, 15_000);

    it('stops being proposed once the editor lets it go', async () => {
        const { host, model, shown } = editorOf(SET);
        const ghostTextOf = vi.fn(() => PROPOSAL);

        ghostModel(model, ghostTextOf).dispose();
        await askGhost(shown);

        expect(ghostTextOf).not.toHaveBeenCalled();
        expect(ghostOf(host)).toBe('');
    }, 15_000);
});
