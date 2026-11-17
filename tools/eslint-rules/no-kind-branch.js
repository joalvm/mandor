/**
 * What differs by kind is chosen from a table, not walked by branches. A `switch`, an `else if`,
 * a run of `if` that ask the same question of one value, a ternary that compares with a text:
 * each grows by a case with every new kind, and each new kind is a new place to forget. A typed
 * table keyed by the kind answers the same question in one line, and a kind it lacks does not
 * compile. A lone `if` that guards, a `typeof`, a test for the empty text and a comparison
 * outside a condition stay: they ask one question once.
 */

const COMPARISONS = new Set(['===', '!==', '==', '!=']);

function isKey(node) {
    return node.type === 'Literal' && ['string', 'number'].includes(typeof node.value);
}

/** A text that names a kind. The empty text names nothing: comparing with it asks if there is anything. */
function isKind(node) {
    return typeof node.value === 'string' && node.value !== '';
}

function isTypeof(node) {
    return node.type === 'UnaryExpression' && node.operator === 'typeof';
}

/** The value and the literal a comparison sets side by side, in either order. */
function comparisonWithKey(node) {
    if (node.type !== 'BinaryExpression' || !COMPARISONS.has(node.operator)) {
        return null;
    }

    const [subject, key] = isKey(node.right) ? [node.left, node.right] : [node.right, node.left];

    return isKey(key) && !isTypeof(subject) ? { subject, key } : null;
}

/** Every comparison of a value with a literal that a condition is made of. */
function comparisonsOf(test) {
    if (test.type === 'LogicalExpression') {
        return [...comparisonsOf(test.left), ...comparisonsOf(test.right)];
    }

    const comparison = comparisonWithKey(test);

    return comparison === null ? [] : [comparison];
}

/**
 * True when the statement asks, of a value an earlier `if` of the block asked about, for a
 * different literal. Two literals inside one condition (`x !== 'a' && x !== 'b'`) are one
 * question about membership, not a series.
 */
function repeatsQuestion(statement, asked, sourceCode) {
    const questions = comparisonsOf(statement.test).map(({ subject, key }) => ({
        text: sourceCode.getText(subject),
        value: key.value,
    }));
    const repeats = questions.some(({ text, value }) =>
        [...(asked.get(text) ?? [])].some((known) => known !== value),
    );

    for (const { text, value } of questions) {
        asked.set(text, (asked.get(text) ?? new Set()).add(value));
    }

    return repeats;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noKindBranch = {
    meta: {
        type: 'problem',
        docs: { description: 'What differs by kind is chosen from a table, not by branches.' },
        schema: [],
        messages: {
            switchBranch: 'Choose by key in a typed table, not with a `switch`.',
            elseIfBranch: 'Choose by key in a typed table, not with an `else if`.',
            ifSeries:
                'This `if` asks again of a value already compared above: choose by key in a typed table.',
            ternaryBranch: 'Choose by key in a typed table, not with a ternary on a text.',
        },
    },
    create(context) {
        const { sourceCode } = context;

        function checkSeries(node) {
            const asked = new Map();

            for (const statement of node.body) {
                if (
                    statement.type === 'IfStatement' &&
                    repeatsQuestion(statement, asked, sourceCode)
                ) {
                    context.report({ node: statement, messageId: 'ifSeries' });
                }
            }
        }

        return {
            SwitchStatement(node) {
                context.report({ node, messageId: 'switchBranch' });
            },
            IfStatement(node) {
                const isElseIf =
                    node.parent.type === 'IfStatement' && node.parent.alternate === node;

                if (isElseIf) {
                    context.report({ node, messageId: 'elseIfBranch' });
                }
            },
            ConditionalExpression(node) {
                const comparison = comparisonWithKey(node.test);

                if (comparison !== null && isKind(comparison.key)) {
                    context.report({ node, messageId: 'ternaryBranch' });
                }
            },
            BlockStatement: checkSeries,
            Program: checkSeries,
        };
    },
};
