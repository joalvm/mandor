import { describe, expect, it } from 'vitest';

import { applyGeneratedPayload } from '../../src/schema-generation/apply-generated-payload.js';
import type { ReplaceAsk } from '../../src/schema-generation/apply-generated-schema.js';

const GENERATED = '{"id": 1}';

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
                    replaceSchemaDetail: 'detail',
                    replaceSchemaTitle: 'title',
                };

                return words[key];
            },
        },
    };
}

describe('applyGeneratedPayload', () => {
    it('applies without asking while the body is empty', () => {
        const screen = harness();

        applyGeneratedPayload({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '',
            schema: '{"type": "object", "properties": {"id": {"type": "number"}}}',
        });

        expect(screen.applied).toEqual([GENERATED]);
        expect(screen.asked()).toBe(0);
    });

    it('applies without asking while the body already meets the schema', () => {
        const screen = harness();

        applyGeneratedPayload({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '{"id": 7}',
            schema: '{"type": "object", "properties": {"id": {"type": "number"}}}',
        });

        expect(screen.applied).toEqual([GENERATED]);
        expect(screen.asked()).toBe(0);
    });

    it('asks before replacing a body that departs from the schema, and the answer replaces', () => {
        const screen = harness();

        applyGeneratedPayload({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '{"id": "siete"}',
            schema: '{"type": "object", "properties": {"id": {"type": "number"}}}',
        });

        expect(screen.applied).toEqual([]);
        expect(screen.asked()).toBe(1);

        screen.answer()?.();

        expect(screen.applied).toEqual([GENERATED]);
    });

    it('forgives the templates of the body: they stand for whatever the schema asks for', () => {
        const screen = harness();

        applyGeneratedPayload({
            apply: screen.apply,
            ask: screen.ask,
            generated: GENERATED,
            payload: '{"id": {{pedidoId}}}',
            schema: '{"type": "object", "properties": {"id": {"type": "number"}}}',
        });

        expect(screen.asked()).toBe(0);
    });
});
