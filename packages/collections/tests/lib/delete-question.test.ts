import { createI18n } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

import { deleteQuestion } from '../../src/lib/delete-question.js';
import type { Doomed } from '../../src/lib/split-deleting.js';

import { WITH_EXAMPLES } from '../support/login-with-examples.js';

const [acceso] = WITH_EXAMPLES;
const ITEM = acceso?.kind === 'collection' ? acceso.children[0] : undefined;
const EXAMPLE = ITEM?.kind === 'item' ? ITEM.examples?.[0] : undefined;

const messages = createI18n('en').getFixedT('en', 'collections');

function ask(doomed: Doomed): string {
    return deleteQuestion(doomed, messages);
}

describe('the question before deleting', () => {
    it('names a node that is the only thing going', () => {
        if (acceso === undefined) {
            throw new Error('no node');
        }

        expect(ask({ examples: [], nodes: [acceso] })).toContain(
            `"${acceso.name}" and everything inside it`,
        );
    });

    it('names an example that is the only thing going', () => {
        if (ITEM?.kind !== 'item' || EXAMPLE === undefined) {
            throw new Error('no example');
        }

        expect(ask({ examples: [{ example: EXAMPLE, item: ITEM }], nodes: [] })).toBe(
            `"${EXAMPLE.name}" leaves the examples of its request. Tabs looking at it stay open, pointing at nothing.`,
        );
    });

    it('counts examples alone as examples, and anything mixed with nodes as entries', () => {
        if (ITEM?.kind !== 'item' || EXAMPLE === undefined || acceso === undefined) {
            throw new Error('no example');
        }

        const example = { example: EXAMPLE, item: ITEM };

        expect(ask({ examples: [example, example], nodes: [] })).toBe(
            '2 examples leave their requests. Tabs looking at them stay open, pointing at nothing.',
        );
        expect(ask({ examples: [example], nodes: [acceso] })).toContain(
            '2 entries and everything inside them',
        );
    });
});
