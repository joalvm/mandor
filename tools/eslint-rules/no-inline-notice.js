/**
 * Mandor tells the user something through a few surfaces and no inline one: a toast, which
 * leaves, the notice centre, which keeps what the toast let go, and the activity log, which
 * keeps the network. A live region opened inside a panel is a banner: it steals height from the
 * work, it interrupts whatever the reader was doing, and it disappears without leaving a trace
 * anybody can copy. The primitives of `@mandor/ui` own the roles; a feature, the shell or an app
 * reaches for a channel instead.
 */

const NOTICE_ROLES = new Set(['alert', 'status']);

function ownsNoticeRoles(filename) {
    return /(?:^|[\\/])packages[\\/]ui[\\/]src[\\/]/.test(filename);
}

function literalValue(node) {
    return node.value !== null && node.value.type === 'Literal' ? node.value.value : undefined;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noInlineNotice = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Notices travel by toast, by the notice centre or by the activity log.',
        },
        schema: [],
        messages: {
            noticeRole:
                'A notice belongs to a toast, to the notice centre or to the activity log, never ' +
                'to a live region inside a panel. Raise it with `useToast` or write it to the activity.',
        },
    },
    create(context) {
        if (ownsNoticeRoles(context.filename)) {
            return {};
        }

        return {
            JSXAttribute(node) {
                const isRole = node.name.type === 'JSXIdentifier' && node.name.name === 'role';

                if (isRole && NOTICE_ROLES.has(literalValue(node))) {
                    context.report({ node, messageId: 'noticeRole' });
                }
            },
        };
    },
};
