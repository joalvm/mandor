import { describe, expect, it } from 'vitest';

import { checkProblem } from '../plans/run-checks.mjs';

describe('a line of a check block', () => {
    it('passes when the file it names is there', () => {
        expect(checkProblem('file package.json')).toBeUndefined();
    });

    it('fails when it is not', () => {
        expect(checkProblem('file packages/nowhere/src/index.ts')).toMatch('is not there');
    });

    // Quotes are what let a value hold a space, which every interesting literal does.
    it('reads a quoted literal as a literal', () => {
        expect(
            checkProblem(
                'contains tools/tests/plans/fixtures/quoted-literal.txt "a literal with several words"',
            ),
        ).toBeUndefined();
        expect(
            checkProblem('contains tools/tests/plans/fixtures/quoted-literal.txt "absent words"'),
        ).toMatch('does not say');
    });

    it('reads a slashed value as a pattern over the tree', () => {
        expect(checkProblem('matches packages/ui/src /export function/')).toBeUndefined();
        expect(checkProblem('no-match packages/ui/src /jamásescritoaquí/')).toBeUndefined();
    });

    it('resolves a package name to its barrel', () => {
        expect(checkProblem('exports @mandor/ui Button')).toBeUndefined();
    });

    // The grammar is small on purpose. A line the gate cannot read is a claim nobody checks,
    // so it fails loudly instead of being skipped quietly.
    it('counts a test named after the file as naming it, as the rule for new files does', () => {
        // The test of the error imports it through the barrel: only its own name says which.
        expect(
            checkProblem('tested packages/store-fs/src/collection/root-item-error.ts'),
        ).toBeUndefined();
        expect(checkProblem('tested packages/ui/src/nowhere/jamas-escrito.ts')).toMatch(
            'no test of the package names',
        );
    });

    it('refuses a verb it does not know', () => {
        expect(checkProblem('inventado package.json')).toMatch('is not a check verb');
    });

    it('refuses a line that is not a check at all', () => {
        expect(checkProblem('solo-una-palabra')).toMatch('is not a check');
    });
});
