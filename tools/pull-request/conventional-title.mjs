import { CHANGE_TYPES } from './change-types.mjs';

const MAX_LENGTH = 120;
// The scope parentheses are written as classes, not escapes: a backslash inside a template
// literal is read by the template before the expression ever reaches RegExp.
const TITLE = new RegExp(`^(${CHANGE_TYPES.join('|')})([(][a-z0-9@/-]+[)])?: .+$`);

/** The title is what the history shows without opening the diff, so it carries the whole rule. */
export function titleProblems(title) {
    const problems = [];

    if (!TITLE.test(title)) {
        problems.push(
            `Title "${title}" is not "type(scope): descripción". ` +
                `Type is one of ${CHANGE_TYPES.join(', ')}; the scope is optional.`,
        );
    }

    if (title.length > MAX_LENGTH) {
        problems.push(
            `Title is ${String(title.length)} characters. The ceiling is ${String(MAX_LENGTH)}.`,
        );
    }

    return problems;
}
