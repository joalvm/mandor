// What an editor of the app can do: each feature is a contribution of its own, and one left out
// is code that never reaches the bundle. The menu and the clipboard are the editor's own, the
// way it ships them. Suggestions are in for whoever gives them: the schema, which the language
// service completes out of the standard itself, and the caller of an editor, which hands the
// list of its own language.
import 'monaco-editor/features/bracketMatching/register.js';
import 'monaco-editor/features/clipboard/register.js';
import 'monaco-editor/features/codicon/register.js';
import 'monaco-editor/features/comment/register.js';
import 'monaco-editor/features/contextmenu/register.js';
import 'monaco-editor/features/dnd/register.js';
import 'monaco-editor/features/find/register.js';
import 'monaco-editor/features/folding/register.js';
import 'monaco-editor/features/hover/register.js';
import 'monaco-editor/features/linesOperations/register.js';
import 'monaco-editor/features/multicursor/register.js';
// The signature of a call while its arguments are written, which the service of scripts gives.
import 'monaco-editor/features/parameterHints/register.js';
// The widget of suggestions: the controller of the editor carries it, and the feature folder
// named suggest only brings the inline completions of another name.
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js';
import 'monaco-editor/features/toggleTabFocusMode/register.js';
// The characters somebody might not see, a bidi or a space of no width: off in every editor, and
// on in the editors of scripts, where code that reads one way and runs another is the trick.
import 'monaco-editor/features/unicodeHighlighter/register.js';
import 'monaco-editor/features/wordOperations/register.js';
// After every feature and before the first language: the services of the editor take their
// replacements only until the first of them is used, and a language is what uses it.
import './main-thread-diff.js';
// Once the replacements are in: it reads the services, and reading them closes the list.
import './main-thread-unicode.js';
// The grammars load the first time a document asks for them, each in a chunk of its own. Three
// of them are languages an editor of the app opens; the rest are never opened on their own and
// are here for the fenced blocks of a doc, which a markdown grammar colours in the language the
// fence names. A doc of this app is written by somebody who codes, so the block of shell it
// carries is the part of the page that has to be read the most carefully.
import 'monaco-editor/languages/definitions/bat/register.js';
import 'monaco-editor/languages/definitions/csharp/register.js';
import 'monaco-editor/languages/definitions/css/register.js';
import 'monaco-editor/languages/definitions/dockerfile/register.js';
import 'monaco-editor/languages/definitions/go/register.js';
import 'monaco-editor/languages/definitions/graphql/register.js';
import 'monaco-editor/languages/definitions/html/register.js';
import 'monaco-editor/languages/definitions/ini/register.js';
import 'monaco-editor/languages/definitions/java/register.js';
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/definitions/kotlin/register.js';
import 'monaco-editor/languages/definitions/php/register.js';
import 'monaco-editor/languages/definitions/powershell/register.js';
import 'monaco-editor/languages/definitions/python/register.js';
import 'monaco-editor/languages/definitions/ruby/register.js';
import 'monaco-editor/languages/definitions/rust/register.js';
import 'monaco-editor/languages/definitions/shell/register.js';
import 'monaco-editor/languages/definitions/sql/register.js';
import 'monaco-editor/languages/definitions/swift/register.js';
import 'monaco-editor/languages/definitions/typescript/register.js';
import 'monaco-editor/languages/definitions/xml/register.js';
import 'monaco-editor/languages/definitions/yaml/register.js';

import { editor, KeyCode, KeyMod, languages } from 'monaco-editor/editor/editor.api.js';

import { WINDOW_THEMES, watchWindowTheme, windowTheme, type WindowTheme } from '../window-theme.js';
import { HEXDUMP_MONARCH } from './hexdump-monarch.js';
import { JSONC_CONFIGURATION, JSONC_MONARCH } from './jsonc-monarch.js';
import './markdown-language.js';
import { markdownTheme } from './markdown-theme.js';
import './schema-language.js';
import './script-language.js';

// The grammar of the payload: comments allowed, and a `{{template}}` standing where a value
// goes. It keeps its own id — the `json` of the standard language service belongs to the schema
// editor, and a payload would be marked broken by that service over what is language of the
// product, not of the format.
languages.register({ aliases: ['jsonc'], id: 'jsonc' });
languages.setMonarchTokensProvider('jsonc', JSONC_MONARCH);
languages.setLanguageConfiguration('jsonc', JSONC_CONFIGURATION);
languages.register({ id: 'binary' });
languages.setMonarchTokensProvider('binary', HEXDUMP_MONARCH);

/**
 * The theme of each theme of the window: the one Monaco ships, with the colours of GitHub on
 * markdown and on nothing else. One theme holds every editor of a window, so markdown cannot
 * have a theme of its own; its tokens can, and no other language emits them.
 */
const MONACO_THEMES = {
    dark: 'mandor-dark',
    'dark-contrast': 'mandor-dark-contrast',
    light: 'mandor-light',
    'light-contrast': 'mandor-light-contrast',
} as const satisfies Record<WindowTheme, string>;

for (const theme of WINDOW_THEMES) {
    editor.defineTheme(MONACO_THEMES[theme], markdownTheme(theme));
}

// One theme holds every editor of the window, so the window's theme is followed once, here.
editor.setTheme(MONACO_THEMES[windowTheme()]);
watchWindowTheme((theme) => {
    editor.setTheme(MONACO_THEMES[theme]);
});

/*
 * Lines break with `
` in every document of the app, whatever machine it runs on. Left to
 * itself the editor breaks the lines of a text that has none yet the way the system does, so a
 * doc written on Windows would reach the repo with a carriage return on every line and read as
 * a whole file rewritten by whoever opened it.
 */
editor.onDidCreateModel((model) => {
    model.setEOL(editor.EndOfLineSequence.LF);
});

// Ctrl+Enter sends what the composer holds; the editor would first add a line to it.
editor.addKeybindingRule({
    command: '-editor.action.insertLineAfter',
    keybinding: KeyMod.CtrlCmd | KeyCode.Enter,
});
