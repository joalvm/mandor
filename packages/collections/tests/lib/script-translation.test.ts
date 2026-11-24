import { createPlainI18n } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

import { conversionsOf, foreignMarksOf } from '../../src/lib/script-translation.js';

function say(key: string, values?: Record<string, number | string>): string {
    return values === undefined ? `<${key}>` : `<${key} ${JSON.stringify(values)}>`;
}

const SCRIPT = 'pm.environment.get("a");\nconst code = res.getStatus();\nbru.runRequest("b");\n';

/** The lines from the start of the one at `line` to the end of it, as the editor gives them. */
function lineOf(text: string, line: number): { from: number; to: number } {
    const lines = text.split('\n');
    const from = lines.slice(0, line).reduce((total, each) => total + each.length + 1, 0);

    return { from, to: from + (lines[line]?.length ?? 0) };
}

describe('the marks of what a script names of another app', () => {
    it('marks each use where it is written, saying the app and whether the bulb converts it', () => {
        expect(foreignMarksOf(say)(SCRIPT)).toEqual([
            {
                from: 0,
                message: '<collections:script.foreign.translatable {"app":"Postman"}>',
                severity: 'error',
                to: 18,
            },
            {
                from: 38,
                message: '<collections:script.foreign.translatable {"app":"Bruno"}>',
                severity: 'error',
                to: 51,
            },
            {
                from: 55,
                message: '<collections:script.foreign.untranslatable {"app":"Bruno"}>',
                severity: 'error',
                to: 69,
            },
        ]);
    });

    it('names Insomnia by its name, and marks nothing in a script of mandor', () => {
        expect(foreignMarksOf(say)('insomnia.environment.get("a");')[0]?.message).toBe(
            '<collections:script.foreign.translatable {"app":"Insomnia"}>',
        );
        expect(foreignMarksOf(say)('mandor.variables.get("a");')).toEqual([]);
    });

    it('has the words of the marks and the bulb in Spanish and in English', () => {
        const keys = [
            'script.foreign.translatable',
            'script.foreign.untranslatable',
            'script.convert.line',
            'script.convert.script',
        ];
        const said = (['es', 'en'] as const).map((language) => {
            const texts = createPlainI18n(language);

            return keys.map((key) => texts.t(`collections:${key}`, { app: 'Bruno' }));
        });

        expect(said).toEqual([
            [
                'Esto es de Bruno: Convertir a mandor.',
                'Esto es de Bruno y no tiene equivalente en mandor.',
                'Convertir a mandor.',
                'Convertir todo el script a mandor.',
            ],
            [
                'This is from Bruno: Convert to mandor.',
                'This is from Bruno and has no counterpart in mandor.',
                'Convert to mandor.',
                'Convert the whole script to mandor.',
            ],
        ]);
    });
});

describe('what the bulb offers on the lines of the caret', () => {
    it('offers the whole script first, then the lines alone, when there is more than them', () => {
        const fixes = conversionsOf(say)(SCRIPT, lineOf(SCRIPT, 0));

        expect(fixes).toEqual([
            {
                edits: [
                    { from: 0, text: 'mandor.variables.get', to: 18 },
                    { from: 38, text: 'mandor.response.status', to: 53 },
                ],
                title: '<collections:script.convert.script>',
            },
            {
                edits: [{ from: 0, text: 'mandor.variables.get', to: 18 }],
                title: '<collections:script.convert.line>',
            },
        ]);
    });

    it('offers the whole script alone when the lines hold all there is to convert', () => {
        const text = 'pm.response.code;\nconsole.log(1);\n';

        expect(conversionsOf(say)(text, lineOf(text, 0))).toEqual([
            {
                edits: [{ from: 0, text: 'mandor.response.status', to: 16 }],
                title: '<collections:script.convert.script>',
            },
        ]);
    });

    it('offers nothing on lines with nothing to convert, nor on what has no counterpart', () => {
        expect(conversionsOf(say)(SCRIPT, lineOf(SCRIPT, 2))).toEqual([]);
        expect(conversionsOf(say)('console.log(1);', lineOf('console.log(1);', 0))).toEqual([]);
    });
});
