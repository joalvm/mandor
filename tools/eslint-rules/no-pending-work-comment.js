/**
 * A comment that promises work is a debt with no owner: nobody reads it again, and the code
 * around it reads as finished. A pending item goes where it will be read — the debts section of
 * the plan that left it — and the code says only what it does. The words are matched in capitals
 * and as whole words, so ordinary prose ("todo archivo nuevo…") passes.
 */

const PENDING = /\b(?:TODO|FIXME|XXX|HACK)\b/u;

/** @type {import('eslint').Rule.RuleModule} */
export const noPendingWorkComment = {
    meta: {
        type: 'problem',
        docs: { description: 'A pending item goes to the debts of a plan, not to a comment.' },
        schema: [],
        messages: {
            pending: 'Un pendiente va a las Deudas de un plan, no a un comentario.',
        },
    },
    create(context) {
        return {
            Program() {
                for (const comment of context.sourceCode.getAllComments()) {
                    if (PENDING.test(comment.value)) {
                        context.report({ loc: comment.loc, messageId: 'pending' });
                    }
                }
            },
        };
    },
};
