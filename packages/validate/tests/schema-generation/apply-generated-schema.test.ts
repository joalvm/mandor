import { describe, expect, it } from 'vitest';

import {
    applyGeneratedSchema,
    type ReplaceAsk,
} from '../../src/schema-generation/apply-generated-schema.js';

const GENERATED = '{"type": "object"}';

type Warned = { action: { label: string; onSelect: () => void }; title: string };

/** A screen of the app reduced to what the guard needs: where it applies and what it says. */
function harness() {
    const applied: string[] = [];
    const warned: Warned[] = [];

    return {
        applied,
        asked: () => warned.length,
        answer: () => warned[0]?.action.onSelect,
        apply: (value: string) => {
            applied.push(value);
        },
        ask: {
            notify: (request: Warned) => {
                warned.push(request);
            },
            words: (key: Parameters<ReplaceAsk['words']>[0]) => {
                const words = {
                    replacePayloadDetail: 'detail',
                    replacePayloadTitle: 'title',
                    replaceSchema: 'Replace',
                    replaceSchemaDetail: 'The current schema says more than the body can rebuild.',
                    replaceSchemaTitle: 'The current schema carries restrictions',
                };

                return words[key];
            },
        },
    };
}

describe('applyGeneratedSchema', () => {
    it('applies without asking while the schema is empty', () => {
        const screen = harness();

        applyGeneratedSchema({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '{"a": 1}',
            schema: '',
        });

        expect(screen.applied).toEqual([GENERATED]);
        expect(screen.asked()).toBe(0);
    });

    it('applies without asking while the schema is the one the body generates', () => {
        const screen = harness();

        applyGeneratedSchema({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '{"a": 1}',
            schema: '{"type": "object", "properties": {"a": {"type": "number"}}}',
        });

        expect(screen.applied).toEqual([GENERATED]);
        expect(screen.asked()).toBe(0);
    });

    /** An option is written into the schema, not work by hand: the generation keeps it. */
    it('keeps the closed objects of the schema it replaces, without asking', () => {
        const screen = harness();
        const closed = { type: 'object', properties: { a: { type: 'number' } } };

        applyGeneratedSchema({
            apply: screen.apply,
            ask: screen.ask,
            generated: JSON.stringify(closed),
            payload: '{"a": 1}',
            schema: JSON.stringify({ ...closed, unevaluatedProperties: false }),
        });

        expect(screen.asked()).toBe(0);
        expect(JSON.parse(screen.applied[0] ?? '')).toEqual({
            ...closed,
            unevaluatedProperties: false,
        });
    });

    it('does nothing while the body cannot be read: nobody is asked about a no-op', () => {
        const screen = harness();

        applyGeneratedSchema({
            apply: screen.apply,
            ask: screen.ask,
            generated: null,
            payload: '{"a": ',
            schema: '{"type": "object"}',
        });

        expect(screen.applied).toEqual([]);
        expect(screen.asked()).toBe(0);
    });

    it('asks and only the answer replaces a schema that says more than the body', () => {
        const screen = harness();

        applyGeneratedSchema({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '{"a": 1}',
            schema: '{"type": "object", "properties": {"a": {"type": "number", "minimum": 1}}}',
        });

        expect(screen.applied).toEqual([]);
        expect(screen.asked()).toBe(1);

        screen.answer()?.();

        expect(screen.applied).toEqual([GENERATED]);
    });
});
