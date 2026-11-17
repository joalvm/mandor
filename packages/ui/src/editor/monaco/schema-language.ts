import { editor, type IDisposable, languages } from 'monaco-editor/editor/editor.api.js';

import { SCHEMA_CONFIGURATION, SCHEMA_MONARCH } from './schema-grammar.js';
import { complete, forget, hover, validate } from './schema-service.js';

/**
 * The language of the schema editor: the standard JSON, with the service of the standard
 * (`vscode-json-languageservice`) behind it, reading every document of the app in the thread
 * of the window. The registration is the grammar and the providers and nothing else: what the
 * service says, it says out of the metaschemas of the standard, which arrive as data.
 */

// The registration the language rides on: one id, and the thread of the window behind it.
languages.register({
    aliases: ['JSON', 'json'],
    extensions: ['.json'],
    id: 'json',
});

// The words of the language, said once: the grammar and the pairs of the standard.
languages.setLanguageConfiguration('json', SCHEMA_CONFIGURATION);
languages.setMonarchTokensProvider('json', SCHEMA_MONARCH);

/** Everything the schema language adds to the window. It is added once, as the window loads. */
function mountJsonLanguage(): IDisposable[] {
    return [
        editor.onDidCreateModel((model) => {
            if (model.getLanguageId() === 'json') {
                void validate(model);
            }

            model.onDidChangeContent(() => {
                if (model.getLanguageId() === 'json') {
                    void validate(model);
                }
            });

            model.onWillDispose(() => {
                forget(model.uri.toString());
            });
        }),
        editor.onDidChangeModelLanguage((event) => {
            if (event.model.getLanguageId() === 'json') {
                void validate(event.model);
            }
        }),
        languages.registerCompletionItemProvider('json', {
            provideCompletionItems: (model, position) => complete(model, position),
            triggerCharacters: ['"', ':'],
        }),
        languages.registerHoverProvider('json', {
            provideHover: (model, position) => hover(model, position),
        }),
    ];
}

// The language is added as the window loads: every editor that asks for `json` finds the
// service standing, the way the grammar and the configuration above are found.
mountJsonLanguage();
