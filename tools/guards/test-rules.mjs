/**
 * The ways a suite stays green while it checks less than it says. Each one is a line that is cheap
 * to write and invisible in a passing run: a test that runs alone, one left out with no reason, a
 * wait on the clock that is slow on a fast machine and flaky on a slow one, a file no runner reads.
 * The testing skill says every one of them in prose; a gate reads it on every push.
 */

const FOCUSED = /\b(?:describe|it|suite|test)\.only\(/u;
const SKIPPED =
    /\b(?:describe|it|suite|test)\.(?:fails|fixme|runIf|skip|skipIf|todo)\(|\bx(?:describe|it)\(/u;
const SLEPT = /\bwaitForTimeout\(|\bsetTimeout\(\s*\w+\s*,\s*[1-9]/u;
const BRIDGE_MOCK = /\bvi\.(?:doMock|mock)\(\s*['"][^'"]*(?:bridge|@mandor\/ipc)/u;
const SHAPED = /^\s*(?:describe|it|test)(?:\.\w+)*\(/mu;
const RUNTIME_EXPECT = /\bexpect(?:\.\w+)*\(/u;

const LINE_RULES = [
    {
        pattern: FOCUSED,
        policy: null,
        says: 'runs alone: every other test of its run is left out, and the run is still green.',
    },
    {
        pattern: SKIPPED,
        policy: 'skip-policy',
        says:
            'is left out of the run with no reason written, and a test that never runs passes for good. ' +
            'Write why on the line above: `// skip-policy: <reason>`.',
    },
    {
        pattern: SLEPT,
        policy: 'timing-policy',
        says:
            'waits by the clock: slow where the machine is fast, flaky where it is slow. Wait for the ' +
            'condition; if time is what is tested, say why on the line above: `// timing-policy: <reason>`.',
    },
];

/**
 * A policy is written on the line itself or in the comment right above it, with a reason after
 * the colon. The comment may run over several lines; a line of code ends it.
 */
function excused(lines, index, policy) {
    const said = new RegExp(`// ${policy}: \\S`, 'u');

    if (said.test(lines[index] ?? '')) {
        return true;
    }

    for (let above = index - 1; above >= 0 && /^\s*\/\//u.test(lines[above] ?? ''); above -= 1) {
        if (said.test(lines[above] ?? '')) {
            return true;
        }
    }

    return false;
}

function lineProblems(file) {
    const lines = file.text.split('\n');

    return lines.flatMap((line, index) =>
        LINE_RULES.filter(
            (rule) =>
                rule.pattern.test(line) &&
                (rule.policy === null || !excused(lines, index, rule.policy)),
        ).map((rule) => `${file.path}:${String(index + 1)}: ${rule.says}`),
    );
}

function fileProblems(file) {
    const problems = [];

    if (file.runner === null && SHAPED.test(file.text)) {
        problems.push(
            `${file.path}: reads like a test and no runner picks it up, so it never runs. Move it ` +
                'where the runner of its package looks, with the extension it expects.',
        );
    }

    if (file.runner === 'dom' && BRIDGE_MOCK.test(file.text)) {
        problems.push(
            `${file.path}: replaces the bridge in the window, where the setup installs one double ` +
                'for every file. Spy on that double with `vi.spyOn`.',
        );
    }

    if (file.runner === 'types' && RUNTIME_EXPECT.test(file.text)) {
        problems.push(
            `${file.path}: asserts at run time in a file only the compiler reads, so the assertion ` +
                'is never evaluated. Move it to the `.test` file beside it.',
        );
    }

    return problems;
}

/** @param {readonly import('./test-files.mjs').TestFile[]} files */
export function testRuleProblems(files) {
    return files.flatMap((file) => [...fileProblems(file), ...lineProblems(file)]);
}
