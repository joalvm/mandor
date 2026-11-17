import { describe, expect, it } from 'vitest';

import { branchNameProblems } from '../../pull-request/branch-name.mjs';
import { forbiddenContentProblems } from '../../pull-request/forbidden-content.mjs';
import { titleProblems } from '../../pull-request/conventional-title.mjs';
import { trailerProblems } from '../../pull-request/commit-trailers.mjs';

describe('the branch name rule', () => {
    it('takes the types the repo uses and the kebab case it writes them in', () => {
        expect(branchNameProblems('feat/host')).toEqual([]);
        expect(branchNameProblems('build/qa-gate')).toEqual([]);
    });

    it('refuses a type the repo does not use and a name that is not kebab case', () => {
        expect(branchNameProblems('perf/host')).not.toEqual([]);
        expect(branchNameProblems('feat/Host_Window')).not.toEqual([]);
        expect(branchNameProblems('host')).not.toEqual([]);
    });

    /** CI checks out the base branch for a push to main, and main is not a change. */
    it('says nothing about main', () => {
        expect(branchNameProblems('main')).toEqual([]);
    });

    /** Dependabot names its branches itself, and its titles are set in .github/dependabot.yml. */
    it('lets a Dependabot branch through and nothing that only looks like one', () => {
        expect(branchNameProblems('dependabot/npm_and_yarn/vitest-4.2.0')).toEqual([]);
        expect(branchNameProblems('dependabot/github_actions/actions/checkout-8')).toEqual([]);
        expect(branchNameProblems('dependabotx/vitest')).not.toEqual([]);
    });
});

describe('the title rule', () => {
    it('takes a conventional title with and without a scope', () => {
        expect(titleProblems('feat(host): la ventana y lo que no se le permite')).toEqual([]);
        expect(titleProblems('docs: el producto completo y sus diez hitos')).toEqual([]);
    });

    it('refuses a missing type, an unknown type and a title over the limit', () => {
        expect(titleProblems('la ventana y lo que no se le permite')).not.toEqual([]);
        expect(titleProblems('perf(host): techos de memoria')).not.toEqual([]);
        expect(titleProblems(`feat(host): ${'a'.repeat(130)}`)).not.toEqual([]);
    });
});

describe('the trailer rule', () => {
    it('refuses a co-authored-by trailer in any casing', () => {
        expect(trailerProblems(['feat: algo\n\nCo-Authored-By: Someone <a@b.c>'])).not.toEqual([]);
        expect(trailerProblems(['feat: algo\n\nco-authored-by: Someone <a@b.c>'])).not.toEqual([]);
    });

    it('says nothing about a message that carries no trailer', () => {
        expect(trailerProblems(['feat: algo\n\nPor qué se hizo.'])).toEqual([]);
    });
});

describe('the forbidden content rule', () => {
    it('refuses a file committed under the local state folder', () => {
        expect(forbiddenContentProblems(['.mandor/connections.yaml'], [])).not.toEqual([]);
    });

    /** A path of one machine in shipped code breaks on every other machine. */
    it('refuses an absolute machine path added to code, and allows one quoted in docs', () => {
        const inCode = [['tools/turbo.mjs', "const root = 'C:/Users/ana/projects/mandor';"]];
        const inDocs = [['CLAUDE.md', '"repo_path": "C:/Users/ana/Documents/projects/mandor"']];

        expect(forbiddenContentProblems([], inCode)).not.toEqual([]);
        expect(forbiddenContentProblems([], inDocs)).toEqual([]);
    });

    /** Windows spells the same path with backslashes, and it travels just as badly. */
    it('refuses a windows path and a home directory of one user', () => {
        const windows = [['packages/host/src/index.ts', "const root = 'C:\\\\Users\\\\ana';"]];
        const home = [['tools/turbo.mjs', "const root = '/home/ana/mandor';"]];

        expect(forbiddenContentProblems([], windows)).not.toEqual([]);
        expect(forbiddenContentProblems([], home)).not.toEqual([]);
    });

    /**
     * A test that names a path either asserts this very rule, and then it needs the string, or
     * hardcodes a real one, and then it dies on the first machine that is not its author's. The
     * diff is not where the second case is caught.
     */
    it('says nothing about a path written inside a test', () => {
        const fixture = [
            ['tools/tests/pull-request/contribution-rules.test.mjs', "'C:\\\\Users\\\\ana'"],
        ];

        expect(forbiddenContentProblems([], fixture)).toEqual([]);
    });
});
