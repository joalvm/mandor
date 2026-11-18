import { describe, expect, it } from 'vitest';

import { sourceFiles } from '../design/source-files.mjs';
import { interfaceLanguageProblems } from '../guards/interface-language.mjs';
import { productionOnlyProblems } from '../guards/production-only.mjs';

const PATH = 'packages/host/src/sample.ts';

describe('developer tooling', () => {
    it('never reaches a build unguarded', async () => {
        expect(productionOnlyProblems(await sourceFiles())).toEqual([]);
    });

    it('is caught when nothing stops it', () => {
        const text = 'session.extensions.loadExtension(path);';

        expect(productionOnlyProblems([{ path: PATH, text }])[0]).toMatch('nothing to stop it');
    });

    it('passes when a build cannot reach it', () => {
        const text = 'if (!app.isPackaged) {\n    void loadExtension(path);\n}';

        expect(productionOnlyProblems([{ path: PATH, text }])).toEqual([]);
    });
});

describe('the language of the main process', () => {
    it('is chosen everywhere it builds interface text', async () => {
        expect(interfaceLanguageProblems(await sourceFiles())).toEqual([]);
    });

    // The bug this catches is invisible to whoever writes it in English: the menu answers in the
    // default language and looks right on the machine that shipped it.
    it('is caught when the call takes no argument', () => {
        const text = 'const t = createPlainI18n().t;';

        expect(interfaceLanguageProblems([{ path: PATH, text }])[0]).toMatch('no language');
    });

    it('passes when the language is passed in', () => {
        const text = 'const t = createPlainI18n(language).t;';

        expect(interfaceLanguageProblems([{ path: PATH, text }])).toEqual([]);
    });
});
