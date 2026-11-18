import { RuleTester } from 'eslint';
import { expect } from 'vitest';

/**
 * ESLint's tester, answering to the runner. It checks its cases with `node:assert`, which the
 * runner does not count, and a test in which the runner counts no assertion fails. So the run of
 * a rule over its cases is the assertion, and a broken case fails it with the message ESLint wrote.
 */
export class CountedRuleTester extends RuleTester {
    run(name, rule, cases) {
        expect(() => {
            super.run(name, rule, cases);
        }).not.toThrow();
    }
}
