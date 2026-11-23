import { SCRIPT_EVENTS } from '@mandor/schema';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { SCRIPT_FIRST_LINE, scriptSourceOf } from '../../src/engine/script-source.js';
import { inputOf } from './guest/support.js';

/**
 * The guest is JavaScript inside template strings: no linter and no compiler read it. These rules
 * catch what a typo or a leftover costs there (a name that is not defined, one defined twice, one
 * nobody reads) and hold it to the shape the rest of the repo keeps.
 */
const RULES: Linter.RulesRecord = {
    'no-undef': 'error',
    'no-redeclare': 'error',
    'no-unused-vars': ['error', { args: 'none' }],
    'no-shadow': 'error',
    curly: 'error',
    'no-else-return': 'error',
    'no-nested-ternary': 'error',
    'one-var': ['error', 'never'],
    'max-depth': ['error', 2],
    complexity: ['error', 10],
    'max-params': ['error', 4],
    'max-statements': ['error', 20],
    'no-restricted-syntax': [
        'error',
        { selector: 'IfStatement > IfStatement.alternate', message: 'else if' },
    ],
};

/**
 * The wrapper ends where the guest starts: the script line, the close of its block and of its
 * function, and the guest opener.
 */
const GUEST_FIRST_LINE = SCRIPT_FIRST_LINE + 4;

const linter = new Linter({ configType: 'flat' });

/** What the linter says about the guest of one event, as `rule: message` lines. */
function findingsOf(event: (typeof SCRIPT_EVENTS)[number]): string[] {
    const source = scriptSourceOf({ ...inputOf(''), event });
    const lines = source.split('\n');
    const messages = linter.verify(source, [
        { languageOptions: { ecmaVersion: 2024, sourceType: 'script' }, rules: RULES },
    ]);

    return messages
        .filter((message) => message.line >= GUEST_FIRST_LINE)
        .map(
            (message) =>
                `${String(message.ruleId)}: ${message.message} :: ${String(lines[message.line - 1]).trim()}`,
        );
}

describe('the assembled guest', () => {
    it('parses for every event', () => {
        const fatal = SCRIPT_EVENTS.flatMap((event) =>
            linter.verify(scriptSourceOf({ ...inputOf(''), event }), [
                { languageOptions: { ecmaVersion: 2024 } },
            ]),
        );

        expect(fatal).toEqual([]);
    });

    it('passes the rules in every event; an object only one event shows may go unread in the rest', () => {
        const perEvent = SCRIPT_EVENTS.map(findingsOf);
        const inEvery = perEvent[0]?.filter((finding) =>
            perEvent.every((findings) => findings.includes(finding)),
        );
        const otherThanUnread = perEvent
            .flat()
            .filter((finding) => !finding.startsWith('no-unused-vars:'));

        expect({ inEvery, otherThanUnread }).toEqual({ inEvery: [], otherThanUnread: [] });
    });
});
