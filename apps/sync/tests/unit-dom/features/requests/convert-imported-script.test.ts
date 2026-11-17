import type { ImportedScript } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { convertImportedScript } from '../../../../src/renderer/features/requests/lib/convert-imported-script.js';

const BEFORE: ImportedScript = {
    event: 'onBeforeRequest',
    dialect: 'postman',
    source: "pm.environment.set('x', 1);\r\n  // tab\there ",
};

const AFTER: ImportedScript = {
    event: 'onResponse',
    dialect: 'insomnia',
    source: 'insomnia.test("ok", () => {});',
};

describe('turning an imported script into one of Mandor', () => {
    it('puts the text, byte by byte, in the script of the same moment', () => {
        expect(convertImportedScript({ importedScripts: [BEFORE] }, 0)).toEqual({
            scripts: { onBeforeRequest: { source: BEFORE.source } },
            importedScripts: undefined,
        });
    });

    it('adds it after the script already there, past a blank line, and keeps its switch', () => {
        const converted = convertImportedScript(
            {
                scripts: {
                    onResponse: { source: 'console.log(1);', enabled: false },
                    onBeforeRequest: { source: 'a();' },
                },
                importedScripts: [BEFORE, AFTER],
            },
            1,
        );

        expect(converted).toEqual({
            scripts: {
                onResponse: { source: `console.log(1);\n\n${AFTER.source}`, enabled: false },
                onBeforeRequest: { source: 'a();' },
            },
            importedScripts: [BEFORE],
        });
    });

    it('does not double the line break a script already ends with', () => {
        const converted = convertImportedScript(
            { scripts: { onResponse: { source: 'a();\n' } }, importedScripts: [AFTER] },
            0,
        );

        expect(converted.scripts?.onResponse?.source).toBe(`a();\n\n${AFTER.source}`);
    });

    it('takes an empty script as no script at all', () => {
        const converted = convertImportedScript(
            { scripts: { onBeforeRequest: { source: '' } }, importedScripts: [BEFORE] },
            0,
        );

        expect(converted.scripts?.onBeforeRequest?.source).toBe(BEFORE.source);
    });

    it('changes nothing for a script that is not there', () => {
        const place = {
            scripts: { onBeforeRequest: { source: 'a();' } },
            importedScripts: [AFTER],
        };

        expect(convertImportedScript(place, 3)).toEqual({
            scripts: place.scripts,
            importedScripts: [AFTER],
        });
    });
});
