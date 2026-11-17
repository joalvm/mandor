import { editor } from 'monaco-editor/editor/editor.api.js';
import { afterEach, describe, expect, it } from 'vitest';

import type { EditorLanguage } from '../../../src/editor/editor-language.js';
import { constructionOptions } from '../../../src/editor/monaco/construction-options.js';
import { runCommand } from '../../../src/editor/monaco/run-command.js';
import '../../../src/editor/monaco/monaco-setup.js';

function mounted(
    value: string,
    language: EditorLanguage,
    readOnly = false,
): editor.IStandaloneCodeEditor {
    const host = document.body.appendChild(document.createElement('div'));
    const options = constructionOptions({ ariaLabel: 'Editor', language, options: { readOnly } });

    return editor.create(host, { ...options, model: editor.createModel(value, language) });
}

afterEach(() => {
    editor.getEditors().forEach((shown) => {
        shown.getContainerDomNode().remove();
        shown.dispose();
    });
    editor.getModels().forEach((model) => {
        model.dispose();
    });
});

describe('laying out the text of an editor', () => {
    /** A parse and a stringify would lose the comments and choke on the templates. */
    it('lays out JSON with its comments and templates where they were written', async () => {
        const shown = mounted('{"n":{{count}}, // c\n"s":"{{name}}"}', 'jsonc');

        await expect(runCommand(shown, 'format')).resolves.toBe(true);
        expect(shown.getValue()).toBe('{\n    "n": {{count}}, // c\n    "s": "{{name}}"\n}');
    });

    it('takes the whole layout back in one undo', async () => {
        const shown = mounted('{"a":1}', 'jsonc');

        await runCommand(shown, 'format');
        await shown.getModel()?.undo();

        expect(shown.getValue()).toBe('{"a":1}');
    });

    it('lays out XML and HTML', async () => {
        const xml = mounted('<a><b x="1">t</b><c/></a>', 'xml');
        const html = mounted(
            '<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>',
            'html',
        );

        await runCommand(xml, 'format');
        await runCommand(html, 'format');

        expect(xml.getValue()).toBe('<a>\n    <b x="1">t</b>\n    <c />\n</a>');
        expect(html.getValue()).toBe(
            '<!doctype html>\n<html>\n    <head>\n        <title>t</title>\n    </head>\n    <body>\n        <p>x</p>\n    </body>\n</html>',
        );
    });

    /** Laying out a broken text would carry the error away from where the person left it. */
    it('leaves a text it cannot read as it was', async () => {
        const shown = mounted('{"a": }', 'jsonc');

        await expect(runCommand(shown, 'format')).resolves.toBe(false);
        expect(shown.getValue()).toBe('{"a": }');
    });

    it('has no layout for prose, and none for a text that is only read', async () => {
        await expect(runCommand(mounted('# a', 'markdown'), 'format')).resolves.toBe(false);
        await expect(runCommand(mounted('{"a":1}', 'jsonc', true), 'format')).resolves.toBe(false);
    });
});
