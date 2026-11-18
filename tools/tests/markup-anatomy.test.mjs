import { describe, expect, it } from 'vitest';

import { markupProblems } from '../design/markup.mjs';
import { repeatedTokenProblems } from '../design/repeated-token.mjs';
import { sourceFiles } from '../design/source-files.mjs';

function problemsOf(text) {
    return markupProblems([{ path: 'packages/ui/src/components/Sample.tsx', text }]);
}

describe('the anatomy of a component', () => {
    it('holds across the whole repo', async () => {
        expect(markupProblems(await sourceFiles())).toEqual([]);
    });

    it('leaves the window landmarks to the zones of the design system', () => {
        expect(problemsOf('<main data-part="x">{c}</main>')[0]).toMatch('@mandor/ui');
    });

    it('asks a section for the name that makes it a region', () => {
        expect(problemsOf('<section data-part="x">{c}</section>')[0]).toMatch('accessible name');
        expect(problemsOf('<section aria-labelledby="h" data-part="x" />')).toEqual([]);
    });

    it('refuses a box with no job', () => {
        expect(problemsOf('<div>{c}</div>')[0]).toMatch('nothing on it');
    });

    // The scan walks braces instead of stopping at the first `>`, so a handler holding an arrow
    // function does not cut the tag in half and hide the rest of its attributes.
    it('reads a tag whose handler holds an arrow function', () => {
        expect(problemsOf('<div onClick={() => { go(); }} data-part="x" />')[0]).toMatch('no role');
    });

    it('says nothing when the tag says why it breaks the rule', () => {
        expect(problemsOf('// markup-policy: forwards-focus\n<div onClick={go} />')).toEqual([]);
    });
});

describe('a token of the system', () => {
    it('is declared once per block', async () => {
        expect(repeatedTokenProblems(await sourceFiles())).toEqual([]);
    });

    it('is caught when the same block declares it twice', () => {
        const text = ':root {\n    --surface-app: red;\n    --surface-app: blue;\n}\n';

        expect(repeatedTokenProblems([{ path: 'a.css', text }])[0]).toMatch('declared twice');
    });

    it('is not caught when two different blocks declare it', () => {
        const text = ':root {\n    --a: red;\n}\n\n[data-theme] {\n    --a: blue;\n}\n';

        expect(repeatedTokenProblems([{ path: 'a.css', text }])).toEqual([]);
    });
});
