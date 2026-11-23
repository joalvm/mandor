import type { ScriptWords, useMessages } from '@mandor/i18n';
import type { RequestScriptOutput } from '@mandor/ipc';
import type { ScriptError, ScriptTest } from '@mandor/schema';
import type { LogLine } from '@mandor/ui';

type Labels = ReturnType<typeof useMessages<'requests'>>;

type LabelKey = Parameters<Labels>[0];

const LEVEL_WORDS: Readonly<Partial<Record<string, LabelKey>>> = {
    collection: 'scriptLevelCollection',
    folder: 'scriptLevelFolder',
    request: 'scriptLevelRequest',
};

const EVENT_WORDS: Readonly<Partial<Record<string, LabelKey>>> = {
    onBeforeRequest: 'scriptEventBefore',
    onResponse: 'scriptEventResponse',
};

/** Each case a script named, and whether it held; a case that broke says why when it was told. */
export function testLines(tests: readonly ScriptTest[], labels: Labels): LogLine[] {
    return tests.map((test, index) => {
        const word = labels(test.passed ? 'scriptTestPassed' : 'scriptTestFailed');

        return {
            key: `test-${String(index)}`,
            tone: test.passed ? 'passed' : 'failed',
            text: test.name,
            detail: test.message === undefined ? word : `${word}: ${test.message}`,
        };
    });
}

function wordOf(words: typeof LEVEL_WORDS, key: string | undefined, labels: Labels) {
    const word = key === undefined ? undefined : words[key];

    return word === undefined ? [] : [labels(word)];
}

/** Where a script stopped, from what is known of it: the level and its name, the moment, the line. */
function placeOf(error: ScriptError, labels: Labels): string | undefined {
    const level = [
        ...wordOf(LEVEL_WORDS, error.level, labels),
        ...(error.name === undefined ? [] : [error.name]),
    ].join(' ');
    const line = error.line === undefined ? [] : [labels('scriptErrorLine', { line: error.line })];
    const parts = [level, ...wordOf(EVENT_WORDS, error.event, labels), ...line].filter(
        (part) => part !== '',
    );

    return parts.length === 0 ? undefined : parts.join(' · ');
}

/** The scripts that were there and did not run, said once for each moment that skipped them. */
function notesOf(push: RequestScriptOutput, labels: Labels): LogLine[] {
    if (push.switchedOff === 0) {
        return [];
    }

    return [
        {
            key: `${push.phase}-scriptsSwitchedOff`,
            tone: 'note',
            text: labels('scriptsSwitchedOff', { count: push.switchedOff }),
        },
    ];
}

/**
 * What one moment of a send writes to the console of the window: the scripts that did not run,
 * what the rest wrote in the order they wrote it, and last where the one that broke stopped.
 * Each line is keyed by its moment, so the two moments of a send sit under one heading. What
 * main said in place of a script is said in the language of the interface.
 */
export function consoleLines(
    push: RequestScriptOutput,
    labels: Labels,
    words: ScriptWords,
): LogLine[] {
    const logs = push.logs.map((log, index): LogLine => ({
        key: `${push.phase}-log-${String(index)}`,
        tone: log.level,
        text: words.line(log),
    }));
    const errors = (push.error === undefined ? [] : [push.error]).map((error): LogLine => ({
        key: `${push.phase}-error`,
        tone: 'error',
        text: words.error(error),
        detail: placeOf(error, labels),
    }));

    return [...notesOf(push, labels), ...logs, ...errors];
}
