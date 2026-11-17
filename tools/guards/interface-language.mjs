/**
 * The main process speaks the language the interface speaks. `createPlainI18n()` with no
 * argument silently answers in the default language, so a menu built that way is English
 * forever and the bug is invisible to whoever wrote it in English. Passing the language is
 * one argument; forgetting it costs the whole menu.
 */

const NO_LANGUAGE = /createPlainI18n\(\s*\)/;

/** @param {readonly {path: string, text: string}[]} files */
export function interfaceLanguageProblems(files) {
    return files
        .filter((file) => /\.tsx?$/.test(file.path))
        .filter((file) => NO_LANGUAGE.test(file.text))
        .map(
            (file) =>
                `${file.path}: calls \`createPlainI18n()\` with no language, so it answers in ` +
                'the default one whatever the interface is set to. Pass the language.',
        );
}
