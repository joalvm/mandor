import { editor, Uri } from 'monaco-editor/editor/editor.api.js';

import type { EditorLanguage } from '../editor-language.js';

/** The document an editor shows: the key two editors share it by, its language and its text. */
export type EditorDocument = { key: string; language: EditorLanguage; value: string };

type Held = { holders: number; model: editor.ITextModel };

const held = new Map<string, Held>();

/**
 * The document of a key, shared by every editor that holds it: two views of one text are one
 * document, with one undo, and what is typed in one is read in the other. The first holder
 * brings the text; a later one finds the text as it was left, in its own language.
 *
 * Lines break with `\n`, which is set on every document the editor makes and not here.
 */
export function retainModel(document: EditorDocument): editor.ITextModel {
    const found = held.get(document.key);

    if (found !== undefined) {
        found.holders += 1;
        editor.setModelLanguage(found.model, document.language);

        return found.model;
    }

    const uri = Uri.parse(`inmemory://mandor/${encodeURIComponent(document.key)}`);
    const model = editor.createModel(document.value, document.language, uri);

    held.set(document.key, { holders: 1, model });

    return model;
}

/** Lets go of the document of a key; the last holder to let go takes it away. */
export function releaseModel(key: string): void {
    const found = held.get(key);

    if (found === undefined) {
        return;
    }

    found.holders -= 1;

    if (found.holders > 0) {
        return;
    }

    held.delete(key);
    found.model.dispose();
}
