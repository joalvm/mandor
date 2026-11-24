import type { Translator } from '@mandor/i18n';
import { foreignUsesOf, translateScript, type Dialect } from '@mandor/script';
import type { DiagnosticsOf, EditorFix, FixesOf } from '@mandor/ui';

/** The name each app goes by, as a mark says it. */
const APP_NAME: Readonly<Record<Dialect, string>> = {
    bruno: 'Bruno',
    insomnia: 'Insomnia',
    postman: 'Postman',
};

/** What the mark of a use says: that the bulb converts it, or that `mandor.` has nothing for it. */
function markKeyOf(translatable: boolean): string {
    return translatable
        ? 'collections:script.foreign.translatable'
        : 'collections:script.foreign.untranslatable';
}

/**
 * Marks where a script names the API of Postman, Insomnia or Bruno, in the words of the window.
 * Such a name does not exist when the script runs, so the mark is an error, converted or not.
 */
export function foreignMarksOf(say: Translator): DiagnosticsOf {
    return (text) =>
        foreignUsesOf(text).map(({ dialect, from, to, translatable }) => ({
            from,
            message: say(markKeyOf(translatable), { app: APP_NAME[dialect] }),
            severity: 'error',
            to,
        }));
}

/**
 * What the bulb offers on the lines of the caret: the whole script converted to `mandor.` first,
 * and those lines alone after it, when there is more to convert than them. Lines with nothing to
 * convert get no bulb.
 */
export function conversionsOf(say: Translator): FixesOf {
    return (text, lines) => {
        const here = translateScript(text, lines).edits;

        if (here.length === 0) {
            return [];
        }

        const whole = translateScript(text).edits;
        const script: EditorFix = { edits: whole, title: say('collections:script.convert.script') };
        const line: EditorFix = { edits: here, title: say('collections:script.convert.line') };

        return here.length < whole.length ? [script, line] : [script];
    };
}
