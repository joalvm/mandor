import { globSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { testFiles } from '../guards/test-files.mjs';
import { testRuleProblems } from '../guards/test-rules.mjs';

// The calls the rules look for are spelled through a variable here: this file is a test file too,
// and the guard reads it with the rest.
const IT = 'it';
const TEST = 'test';
const SLEEP = 'setTimeout';
const PAUSE = 'waitForTimeout';
const MOCK = 'vi.mock';

const PATH = 'packages/shell/tests/sample.test.ts';

function problemsOf(text, runner = 'node', path = PATH) {
    return testRuleProblems([{ path, runner, text }]);
}

describe('the test files of the repository', () => {
    it('keep every rule', () => {
        expect(testRuleProblems(testFiles(process.cwd()))).toEqual([]);
    });

    it('are found where every runner looks, each with the runner that picks it up', () => {
        const files = testFiles(process.cwd());
        const runnerOf = (path) => files.find((file) => file.path === path)?.runner;

        expect(runnerOf('tools/tests/test-rules.test.mjs')).toBe('node');
        expect(runnerOf('packages/ui/tests/testing/editors-in.test.tsx')).toBe('dom');
        expect(runnerOf('apps/async/tests/e2e/first-run.spec.ts')).toBe('e2e');
        expect(runnerOf('packages/ipc/tests/request/request-area.test-d.ts')).toBe('types');
        expect(runnerOf('apps/async/tests/e2e/support/launch-app.ts')).toBeNull();
    });
});

describe('a test that runs alone', () => {
    it('is caught: the rest of its run is left out and the run stays green', () => {
        expect(problemsOf(`${IT}.only('runs', () => {});`)[0]).toMatch(`${PATH}:1: runs alone`);
    });
});

describe('a test left out of the run', () => {
    it('is caught when no reason is written', () => {
        expect(problemsOf(`\n${IT}.skip('later', () => {});`)[0]).toMatch(`${PATH}:2:`);
        expect(problemsOf(`${TEST}.fixme(true, 'broken');`)).toHaveLength(1);
        expect(problemsOf(`${IT}.skipIf(windows)('reads', () => {});`)).toHaveLength(1);
        expect(problemsOf(`${IT}.todo('one day');`)).toHaveLength(1);
    });

    it('passes when the line above says why', () => {
        const text = `// skip-policy: no job installs a build yet.\n${TEST}.skip(path === '', 'no build');`;

        expect(problemsOf(text)).toEqual([]);
    });
});

describe('a test that waits by the clock', () => {
    it('is caught, in a window and in a promise alike', () => {
        expect(problemsOf(`await page.${PAUSE}(300);`)[0]).toMatch('waits by the clock');
        expect(problemsOf(`await new Promise((r) => ${SLEEP}(r, 100));`)).toHaveLength(1);
    });

    /** Yielding a turn waits for nothing in particular: it lets what is queued run. */
    it('passes when it only gives up its turn', () => {
        expect(problemsOf(`await new Promise((r) => ${SLEEP}(r, 0));`)).toEqual([]);
    });

    it('passes when the comment above says why time is what is tested', () => {
        const text = `// timing-policy: the state takes the text\n// a render later.\nawait page.${PAUSE}(300);`;

        expect(problemsOf(text)).toEqual([]);
    });

    it('is caught when the reason belongs to a line of code further up', () => {
        const text = `// timing-policy: the state takes the text a render later.\nawait type();\nawait page.${PAUSE}(300);`;

        expect(problemsOf(text)).toHaveLength(1);
    });
});

describe('a file that reads like a test', () => {
    it('is caught when no runner picks it up: it never runs', () => {
        const problems = problemsOf(
            `describe('rules', () => {});`,
            null,
            'packages/schema/tests/a.test.tsx',
        );

        expect(problems[0]).toMatch('no runner picks it up');
    });

    it('passes when it only helps the tests that run', () => {
        expect(problemsOf('export const fixture = 1;', null)).toEqual([]);
    });
});

describe('a type test', () => {
    const TYPES = 'packages/ipc/tests/area.test-d.ts';

    /** The compiler reads the file and nothing runs it: the assertion would never be evaluated. */
    it('is caught when it asserts at run time', () => {
        expect(problemsOf('expect(answer).toBe(1);', 'types', TYPES)[0]).toMatch('never evaluated');
        expect(problemsOf('expect.soft(answer).toBe(1);', 'types', TYPES)).toHaveLength(1);
    });

    it('passes when it asserts on types only', () => {
        expect(problemsOf('expectTypeOf<Area>().toBeObject();', 'types', TYPES)).toEqual([]);
    });

    /** Nothing else reads a type test: a project that stops compiling its tests drops them all. */
    it('is compiled by every package and app, whose project takes its tests folder', () => {
        const projects = globSync('{packages,apps}/*/tsconfig.json');
        const include = (path) => JSON.parse(readFileSync(path, 'utf8')).include;

        expect(projects.length).toBeGreaterThan(0);
        expect(projects.filter((path) => !include(path).includes('tests'))).toEqual([]);
    });
});

describe('a window test that replaces the bridge', () => {
    it('is caught: the setup installs one double for every file', () => {
        expect(problemsOf(`${MOCK}('@mandor/ipc');`, 'dom')[0]).toMatch('vi.spyOn');
    });

    /** In node there is no window and no double: replacing the module is how the runtime is cut. */
    it('passes in node, where the module is all there is', () => {
        expect(problemsOf(`${MOCK}('../bridge.js');`, 'node')).toEqual([]);
    });
});
